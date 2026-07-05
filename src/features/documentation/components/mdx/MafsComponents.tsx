"use client";

import React, { useMemo } from "react";
import { Mafs, Coordinates, Plot, Point, Line, Theme, vec } from "mafs";
import "mafs/core.css";
import "mafs/font.css";
import "katex/dist/katex.min.css";
import { BlockMath, InlineMath } from "react-katex";
import { cn } from "@/lib/utils";

// ==========================================
// MAFS WRAPPERS FOR MDX (Serializable Props)
// ==========================================

export function MafsBoard({
  children,
  expression,
  defaultWidth = 500,
  height = 400,
  initialViewBox = { x: [-5, 5], y: [-5, 5] },
  preserveAspectRatio = "contain",
  className,
}: any) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(defaultWidth);
  const [measured, setMeasured] = React.useState(false);
  const [viewBox, setViewBox] = React.useState(initialViewBox);

  // Manual ResizeObserver to prevent Mafs internal NaN with width="auto"
  React.useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      if (entries[0] && entries[0].contentRect.width > 0) {
        setWidth(entries[0].contentRect.width);
        setMeasured(true);
      }
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Zoom controls
  const handleZoomIn = () => {
    setViewBox((prev: any) => ({
      x: [prev.x[0] * 0.75, prev.x[1] * 0.75],
      y: [prev.y[0] * 0.75, prev.y[1] * 0.75]
    }));
  };

  const handleZoomOut = () => {
    setViewBox((prev: any) => ({
      x: [prev.x[0] * 1.25, prev.x[1] * 1.25],
      y: [prev.y[0] * 1.25, prev.y[1] * 1.25]
    }));
  };

  return (
    <div className={cn("my-8 flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-lg relative", className)}>
      {/* Zoom UI Overlay */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
         <button onClick={handleZoomIn} className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition shadow-sm" title="Zoom In">+</button>
         <button onClick={handleZoomOut} className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition shadow-sm" title="Zoom Out">-</button>
      </div>

      {expression && (
        <div className="math-expression overflow-x-auto text-center text-xl text-foreground">
          <BlockMath math={expression} />
        </div>
      )}
      <div ref={containerRef} className="mafs-container w-full overflow-hidden rounded-lg bg-white/5 ring-1 ring-border dark:bg-black/20">
        {measured && (
          <Mafs viewBox={viewBox} pan={true} zoom={true} preserveAspectRatio={preserveAspectRatio} width={width} height={height}>
            {children}
          </Mafs>
        )}
      </div>
    </div>
  );
}

export function MafsCoordinates({
  xAxis = {},
  yAxis = {},
  subdivisions = 4,
}: any) {
  return <Coordinates.Cartesian xAxis={xAxis} yAxis={yAxis} subdivisions={subdivisions} />;
}

export function MafsPlot({
  y,
  color = Theme.blue,
  weight = 2,
  opacity = 1,
  fillOpacity = 0,
}: any) {
  // Parsea strings como "Math.sin(x)" desde MDX a funciones reales (para evitar errores de serialización RSC)
  const func = useMemo(() => {
    if (typeof y === "function") return y;
    if (typeof y === "string") {
      try {
        return new Function("x", `with(Math) { return ${y}; }`);
      } catch (e) {
        console.error("Mafs Plot Function Error:", e);
        return () => 0;
      }
    }
    return () => 0;
  }, [y]);

  return <Plot.OfX y={func} color={color} weight={weight} opacity={opacity} />;
}

export function MafsPoint({
  x,
  y,
  color = Theme.red,
}: any) {
  if (x === undefined || y === undefined || x === null || y === null) {
    return null;
  }
  
  const numX = Number(x);
  const numY = Number(y);
  
  if (isNaN(numX) || isNaN(numY)) {
      return null;
  }
  
  return <Point x={numX} y={numY} color={color} />;
}
