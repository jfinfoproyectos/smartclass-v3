"use client";

import React, { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Graph } from "@antv/x6";
import { useTheme } from "next-themes";
import { Maximize2, Minimize2 } from "lucide-react";

interface X6Node {
  id: string;
  label: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  color?: string;
  type?: string;
}

interface X6Edge {
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
}

interface X6DiagramData {
  nodes: X6Node[];
  edges: X6Edge[];
}

interface X6DiagramProps {
  data: string | X6DiagramData;
  height?: number;
  interactive?: boolean;
  className?: string;
}

function DiagramCanvas({
  data,
  height,
  interactive,
  isFullscreen,
}: {
  data: X6DiagramData;
  height: number;
  interactive: boolean;
  isFullscreen: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!containerRef.current || !data?.nodes || !data?.edges) return;

    const isDark = resolvedTheme === "dark";
    const gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
    const nodeBg = isDark ? "#1e293b" : "#ffffff";
    const nodeBorder = isDark ? "#334155" : "#e2e8f0";
    const textColor = isDark ? "#f8fafc" : "#1e293b";
    const edgeColor = isDark ? "#64748b" : "#94a3b8";

    const graph = new Graph({
      container: containerRef.current,
      autoResize: true,
      height: isFullscreen ? window.innerHeight : height,
      background: { color: "transparent" },
      grid: {
        visible: true,
        type: "dot",
        size: 20,
        args: { color: gridColor, thickness: 1 },
      },
      interacting: {
        nodeMovable: interactive,
        edgeMovable: interactive,
      },
      panning: interactive,
      mousewheel: interactive,
    });

    const nodes = data.nodes.map((n) => ({
      id: n.id,
      shape: n.type || "rect",
      x: n.x ?? 0,
      y: n.y ?? 0,
      width: n.width ?? 120,
      height: n.height ?? 45,
      label: n.label,
      attrs: {
        body: {
          fill: n.color || nodeBg,
          stroke: nodeBorder,
          strokeWidth: 2,
          rx: 10,
          ry: 10,
        },
        label: {
          text: n.label,
          fill: textColor,
          fontSize: 13,
          fontWeight: "bold",
        },
      },
    }));

    const edges = data.edges.map((e) => ({
      source: e.source,
      target: e.target,
      label: e.label,
      attrs: {
        line: {
          stroke: edgeColor,
          strokeWidth: 2,
          targetMarker: "classic",
          strokeDasharray: e.animated ? "5 5" : "0",
          ...(e.animated && {
            style: { animation: "x6-flow 30s infinite linear" },
          }),
        },
      },
      connector: { name: "rounded" },
      router: { name: "manhattan" },
    }));

    graph.fromJSON({ nodes, edges });
    graph.zoomToFit({ maxScale: 1, minScale: 0.1, padding: 20 });
    graph.centerContent();

    const handleResize = () => {
      graph.zoomToFit({ maxScale: 1, minScale: 0.1, padding: 20 });
      graph.centerContent();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      graph.dispose();
    };
  }, [data, height, interactive, resolvedTheme, isFullscreen]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: isFullscreen ? "100vh" : `${height}px` }}
    />
  );
}

export function X6Diagram({
  data: rawData,
  height = 400,
  interactive = true,
  className = "",
}: X6DiagramProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close with Escape key
  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isFullscreen]);

  // Prevent body scroll when fullscreen
  useEffect(() => {
    document.body.style.overflow = isFullscreen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isFullscreen]);

  // Parse data safely
  const data: X6DiagramData | null = useMemo(() => {
    if (!rawData) return null;
    if (typeof rawData === "string") {
      try {
        let clean = rawData.trim();
        if (clean.startsWith("{") && clean.endsWith("}")) {
          const inner = clean.slice(1, -1).trim();
          if (inner.startsWith("{") && inner.endsWith("}")) {
            clean = inner;
          }
        }
        return new Function("return " + clean)() as X6DiagramData;
      } catch (e) {
        console.error("X6Diagram: Failed to parse data string", e);
        return null;
      }
    }
    return rawData as X6DiagramData;
  }, [rawData]);

  if (!data?.nodes || !data?.edges) {
    return (
      <div className="my-8 p-8 border border-dashed border-amber-500/50 rounded-xl bg-amber-500/5 text-center text-amber-500 text-sm">
        ⚠️ X6Diagram: La propiedad <code className="mx-1 px-1 bg-amber-500/10 rounded">data</code> debe incluir{" "}
        <code className="mx-1 px-1 bg-amber-500/10 rounded">nodes</code> y{" "}
        <code className="mx-1 px-1 bg-amber-500/10 rounded">edges</code>.
      </div>
    );
  }

  const FullscreenButton = ({ onClick, icon }: { onClick: () => void; icon: React.ReactNode }) => (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-background/80 backdrop-blur-md border border-border text-foreground hover:bg-accent transition-all duration-200 text-xs font-medium shadow-lg group"
      title={isFullscreen ? "Salir de pantalla completa (Esc)" : "Pantalla completa"}
    >
      {icon}
      <span className="hidden group-hover:inline transition-all">{isFullscreen ? "Salir" : "Expandir"}</span>
    </button>
  );

  const inlineContent = (
    <div className={`relative my-8 border border-border rounded-xl bg-card overflow-hidden shadow-lg ${className}`}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes x6-flow { to { stroke-dashoffset: -1000; } }
      `}} />

      {/* Toolbar */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        {!interactive && (
          <div className="bg-muted/70 backdrop-blur-sm px-2 py-1 rounded text-[10px] text-muted-foreground uppercase tracking-widest pointer-events-none">
            Vista previa
          </div>
        )}
        <FullscreenButton
          onClick={() => setIsFullscreen(true)}
          icon={<Maximize2 size={14} />}
        />
      </div>

      <DiagramCanvas
        data={data}
        height={height}
        interactive={interactive}
        isFullscreen={false}
      />
    </div>
  );

  const fullscreenOverlay = mounted && isFullscreen
    ? createPortal(
        <div
          className="fixed inset-0 z-[9999] flex flex-col bg-background"
          style={{ width: "100vw", height: "100vh" }}
        >
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes x6-flow { to { stroke-dashoffset: -1000; } }
          `}} />

          {/* Fullscreen Toolbar */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-3">
            <div className="px-3 py-1.5 bg-muted/60 backdrop-blur-sm rounded-lg text-xs text-muted-foreground border border-border">
              💡 Usa la rueda del mouse para hacer zoom · Arrastra para moverse · <kbd className="font-mono bg-muted px-1 rounded">Esc</kbd> para cerrar
            </div>
            <FullscreenButton
              onClick={() => setIsFullscreen(false)}
              icon={<Minimize2 size={14} />}
            />
          </div>

          {/* Diagram fills full viewport */}
          <DiagramCanvas
            data={data}
            height={height}
            interactive={interactive}
            isFullscreen={true}
          />
        </div>,
        document.body
      )
    : null;

  return (
    <>
      {inlineContent}
      {fullscreenOverlay}
    </>
  );
}
