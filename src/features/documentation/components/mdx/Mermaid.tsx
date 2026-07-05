"use client";

import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { Loader2, AlertCircle } from "lucide-react";
import { useTheme } from "next-themes";

interface MermaidProps {
  chart: string;
}

export function Mermaid({ chart }: MermaidProps) {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: resolvedTheme === "dark" ? "dark" : "default",
      securityLevel: "loose",
      fontFamily: "var(--font-sans)",
    });

    const renderChart = async () => {
      if (!chart) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg: generatedSvg } = await mermaid.render(id, chart);
        setSvg(generatedSvg);
      } catch (err) {
        console.error("Mermaid error:", err);
        setError("Error al renderizar el diagrama Mermaid. Verifica la sintaxis.");
      } finally {
        setLoading(false);
      }
    };

    renderChart();
  }, [chart, resolvedTheme]);

  if (loading && !svg) {
    return (
      <div className="flex items-center justify-center p-8 bg-muted/20 rounded-lg border border-dashed border-border my-6">
        <Loader2 className="w-6 h-6 animate-spin text-primary opacity-50" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20 text-sm font-medium my-4">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="mermaid-container my-8 flex justify-center bg-white dark:bg-zinc-950/40 p-6 rounded-xl border border-border shadow-sm overflow-x-auto select-none"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
