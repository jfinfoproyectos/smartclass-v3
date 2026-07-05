"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface P5SketchProps {
  code?: string;
  height?: number;
  title?: string;
  className?: string;
}

function useP5(
  containerRef: React.RefObject<HTMLDivElement | null>,
  code: string | undefined,
  active: boolean,
  overrideHeight?: number
) {
  const instanceRef = useRef<any>(null);

  useEffect(() => {
    if (!active || !containerRef.current || !code) return;
    const container = containerRef.current;

    let instance: any;

    import("p5").then(({ default: p5 }) => {
      // Clean up any previous instance
      if (instanceRef.current) {
        try { instanceRef.current.remove(); } catch {}
        instanceRef.current = null;
      }

      const sketchFn = (p: any) => {
        try {
          const wrapper = new Function(
            "p",
            `var setup,draw,mousePressed,mouseReleased,mouseClicked,
             mouseDragged,mouseMoved,keyPressed,keyReleased,
             windowResized,touchStarted,touchMoved,touchEnded;
             with(p){
               ${code}
             }
             if(typeof setup!=='undefined') p.setup=setup;
             if(typeof draw!=='undefined') p.draw=draw;
             if(typeof mousePressed!=='undefined') p.mousePressed=mousePressed;
             if(typeof mouseReleased!=='undefined') p.mouseReleased=mouseReleased;
             if(typeof mouseClicked!=='undefined') p.mouseClicked=mouseClicked;
             if(typeof mouseDragged!=='undefined') p.mouseDragged=mouseDragged;
             if(typeof mouseMoved!=='undefined') p.mouseMoved=mouseMoved;
             if(typeof keyPressed!=='undefined') p.keyPressed=keyPressed;
             if(typeof keyReleased!=='undefined') p.keyReleased=keyReleased;
             if(typeof windowResized!=='undefined') p.windowResized=windowResized;
             if(typeof touchStarted!=='undefined') p.touchStarted=touchStarted;`
          );
          wrapper(p);
        } catch (e: any) {
          p.setup = () => {
            p.createCanvas(container.clientWidth || 600, overrideHeight || 400);
            p.background(20);
            p.fill(255, 80, 80);
            p.noStroke();
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(13);
            p.text(`Error: ${e.message}`, p.width / 2, p.height / 2);
          };
          p.draw = () => {};
        }
      };

      instance = new p5(sketchFn, container);
      instanceRef.current = instance;
    });

    return () => {
      try { instance?.remove(); } catch {}
      instanceRef.current = null;
    };
  }, [active, code, overrideHeight]);
}

export function P5Sketch({
  code = "",
  height = 400,
  title = "p5.js Sketch",
  className = "",
}: P5SketchProps) {
  const resolvedCode = code.trim();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const inlineRef = useRef<HTMLDivElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // ESC closes fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setIsFullscreen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isFullscreen]);

  // Block scroll in fullscreen
  useEffect(() => {
    document.body.style.overflow = isFullscreen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isFullscreen]);

  // p5 instances
  useP5(inlineRef, resolvedCode, !isFullscreen, height);
  useP5(fullscreenRef, resolvedCode, isFullscreen);

  if (!resolvedCode) {
    return (
      <div className="my-8 p-8 border border-dashed border-amber-500/50 rounded-xl bg-amber-500/5 text-center text-amber-500 text-sm">
        ⚠️ P5Sketch: Usa un bloque de código con lenguaje{" "}
        <code className="mx-1 px-1 bg-amber-500/10 rounded">```p5</code> en el MDX.
      </div>
    );
  }

  const toolbar = (fs: boolean) => (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
      <div className="flex items-center gap-3">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-rose-500/70" />
          <div className="w-3 h-3 rounded-full bg-amber-500/70" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
        </div>
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
      </div>
      <button
        onClick={() => setIsFullscreen(f => !f)}
        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        title={fs ? "Salir de pantalla completa" : "Pantalla completa"}
      >
        {fs ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
      </button>
    </div>
  );

  const inlineEl = (
    <div className={cn("my-8 rounded-xl border border-border bg-card overflow-hidden shadow-lg flex flex-col items-center", className)}>
      {toolbar(false)}
      {/* Canvas container — centrado horizontalmente */}
      <div
        ref={inlineRef}
        style={{ height: `${height}px`, width: "100%", overflow: "hidden", display: "flex", justifyContent: "center" }}
      />
    </div>
  );

  const fullscreenEl = mounted && isFullscreen
    ? createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col bg-background" style={{ width: "100vw", height: "100vh" }}>
          {toolbar(true)}
          <div className="absolute top-14 right-4 z-10 text-[10px] text-muted-foreground bg-card/80 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5">
            <kbd className="font-mono bg-muted px-1 rounded">Esc</kbd> para cerrar
          </div>
          <div ref={fullscreenRef} style={{ flex: 1, width: "100%", overflow: "hidden", display: "flex", justifyContent: "center" }} />
        </div>,
        document.body
      )
    : null;

  return (
    <>
      {inlineEl}
      {fullscreenEl}
    </>
  );
}
