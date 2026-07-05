"use client";

import React, { useEffect, useRef, useState, useId } from "react";
import { cn } from "@/lib/utils";

// Declaración dinámica para evitar SSR issues
let JXG: any = null;

interface JSXGraphBoardProps {
  code?: string;
  boardId?: string;
  width?: number | string;
  height?: number | string;
  className?: string;
  title?: string;
  attributes?: any;
}

export function JSXGraphBoard({
  code = "",
  boardId: providedBoardId,
  width = "100%",
  height = 400,
  className = "",
  title = "JSXGraph Interactive Board",
  attributes = {}
}: JSXGraphBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reactId = useId().replace(/:/g, "");
  const [boardId] = useState(() => providedBoardId || `jxgbox-${reactId}`);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Dynamic import to prevent document/window is not defined errors during SSR
    import("jsxgraph").then((module) => {
      JXG = module.default || module;
      setIsLoaded(true);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!isLoaded || !containerRef.current || !JXG) return;

    // Remove any existing board initialized by generic JXG mapping to same ID
    if (JXG.boards && JXG.boards[boardId]) {
       JXG.JSXGraph.freeBoard(JXG.boards[boardId]);
    }

    const defaultAttributes = {
      boundingbox: [-5, 5, 5, -5],
      axis: true,
      showCopyright: false,
      showNavigation: true,
      grid: true,
      ...attributes
    };

    let board: any;

    try {
      board = JXG.JSXGraph.initBoard(containerRef.current, defaultAttributes);

      if (code) {
        // En MDX, a veces los literales reciben escape HTML al compilarse
        let parseCode = code;
        if (typeof document !== "undefined") {
            const txt = document.createElement("textarea");
            txt.innerHTML = code;
            parseCode = txt.value;
        }
        
        // Envolvemos el código con acceso seguro al objeto board
        const execCode = new Function("board", "JXG", `
          try {
            ${parseCode}
          } catch(e) {
             console.error("Error executing JSXGraph code:\\n", e);
          }
        `);
        console.log("Executing Graph Code:", parseCode);
        execCode(board, JXG);
        
        // Ensure board update
        if (board.update) board.update();
      }
    } catch (e) {
      console.error("Failed to initialize JSXGraph board:", e);
    }

    return () => {
      /* 
      if (board) {
         try {
             JXG.JSXGraph.freeBoard(board);
         } catch(e) {}
      }
      */
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, code, boardId, JSON.stringify(attributes)]);

  console.log("JSXGraph code length:", code?.length, "Content:", code);

  return (
    <div className={cn("my-8 rounded-xl border border-border bg-card overflow-hidden shadow-lg flex flex-col", className)}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-500/70" />
            <div className="w-3 h-3 rounded-full bg-amber-500/70" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">{title}</span>
        </div>
      </div>
      
      {/* Board container */}
      <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/jsxgraph/distrib/jsxgraph.css" />
      <div 
        className="w-full relative" 
        style={{ display: "flex", justifyContent: "center", background: "var(--background)", overflow:"hidden" }}
      >
        <div
          ref={containerRef}
          id={boardId}
          className="jxgbox"
          style={{ width, height, border: "none" }}
        />
        {!isLoaded && (
           <div className="absolute inset-0 flex items-center justify-center bg-card/50 backdrop-blur-sm z-10">
              <span className="text-xs text-muted-foreground animate-pulse">Loading engine...</span>
           </div>
        )}
      </div>
    </div>
  );
}
