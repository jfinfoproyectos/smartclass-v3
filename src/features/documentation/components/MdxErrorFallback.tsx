"use client";

import React from "react";
import { AlertCircle, FileX, Code2 } from "lucide-react";

interface MdxErrorFallbackProps {
  error?: Error | string;
  resetErrorBoundary?: () => void;
}

export function MdxErrorFallback({ error, resetErrorBoundary }: MdxErrorFallbackProps) {
  // Extract specific details if it's a compiler error
  const errorMessage = typeof error === 'string' ? error : error?.message;
  
  // Attempt to extract line number from various possible error structures
  const errorObj = typeof error === 'object' ? (error as any) : {};
  let line = errorObj.line || errorObj.position?.start?.line;
  
  // Fallback: try to extract line from message string if not found (MDX error format usually "(line:col)")
  if (!line && errorMessage) {
    const match = errorMessage.match(/\((\d+):\d+/);
    if (match) line = match[1];
  }

  return (
    <div className="my-12 flex flex-col items-center justify-center p-8 md:p-16 text-center border-2 border-dashed border-destructive/30 rounded-[2.5rem] bg-destructive/5 backdrop-blur-sm animate-in fade-in duration-500">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-destructive/20 rounded-full blur-2xl animate-pulse" />
        <div className="relative w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive border border-destructive/20">
          <FileX className="w-8 h-8" />
        </div>
      </div>
      
      <div className="max-w-md space-y-3">
        <h3 className="text-xl font-black uppercase tracking-tight text-destructive">
          Documento no disponible
        </h3>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Este documento no es posible visualizarlo correctamente debido a <span className="font-bold text-foreground underline decoration-destructive/30">problemas de sintaxis</span> en el contenido Markdown/MDX.
        </p>
      </div>

      {(errorMessage || line) && (
        <div className="mt-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-left w-full max-w-lg overflow-hidden relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-destructive" />
              <span className="text-[10px] font-black uppercase tracking-widest text-destructive/70">Detalle del Error</span>
            </div>
            {line && (
              <span className="px-2 py-0.5 rounded-full bg-destructive text-[10px] font-black uppercase tracking-tighter shadow-sm">
                Línea {line}
              </span>
            )}
          </div>
          <p className="text-[11px] font-mono text-destructive break-words line-clamp-3">
            {errorMessage}
          </p>
        </div>
      )}

      <div className="mt-8 flex flex-col items-center gap-4 w-full max-w-sm">
        <div className="w-full p-4 rounded-xl bg-black/5 dark:bg-white/5 border border-white/10 text-left">
          <div className="flex items-center gap-2 mb-2">
            <Code2 className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sugerencia Técnica</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Verifica que todas las etiquetas (como <code className="text-primary font-bold">&lt;Alert&gt;</code>) estén correctamente cerradas y que no existan caracteres especiales sin escapar.
          </p>
        </div>

        {resetErrorBoundary && (
          <button 
            onClick={resetErrorBoundary}
            className="text-xs font-bold uppercase tracking-widest text-primary hover:underline underline-offset-4 transition-all"
          >
            Reintentar Visualización
          </button>
        )}
      </div>
    </div>
  );
}
