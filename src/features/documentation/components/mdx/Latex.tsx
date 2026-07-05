"use client";

import React from "react";
import "katex/dist/katex.min.css";
import { BlockMath, InlineMath } from "react-katex";
import { cn } from "@/lib/utils";

/**
 * Componente para renderizar bloques matemáticos LaTeX.
 * Soporta la fórmula mediante la propiedad `math` o como bloque texto si se escapa correctamente.
 */
export function LatexBlock({
  math,
  children,
  className,
  title,
}: {
  math?: string;
  children?: string;
  className?: string;
  title?: string;
}) {
  const content = math || children || "";

  return (
    <div className={cn("my-6 flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm", className)}>
      {title && (
        <div className="bg-muted/50 px-4 py-2 text-sm font-medium border-b border-border text-muted-foreground">
          {title}
        </div>
      )}
      <div className="overflow-x-auto p-6 text-center text-xl text-foreground">
        <BlockMath math={content} />
      </div>
    </div>
  );
}

/**
 * Componente para matemáticas en línea dentro de párrafos.
 */
export function LatexInline({
  math,
  children,
}: {
  math?: string;
  children?: string;
}) {
  const content = math || children || "";
  return <InlineMath math={content} />;
}
