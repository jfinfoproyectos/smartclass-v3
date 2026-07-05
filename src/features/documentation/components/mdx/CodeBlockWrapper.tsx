"use client"

import React, { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Check, Copy, Maximize2, Minimize2, ZoomIn, ZoomOut, Hash, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCodeZoom } from "./CodeZoomContext"

export function CodeBlockWrapper({ children, className, ...props }: any) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const { zoomLevel, setZoomLevel, zoomClasses } = useCodeZoom()
  const [showNumbers, setShowNumbers] = useState(true)
  const [copied, setCopied] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen])

  // Extraer texto plano y title
  let codeString = "";
  let extractedTitle = "";
  try {
    const childrenArray = Array.isArray(children) ? children : [children];
    const pre = childrenArray.find((c: any) => c?.type === "pre");
    const figcaption = childrenArray.find((c: any) => c?.type === "figcaption");
    
    if (figcaption && figcaption.props && figcaption.props.children) {
      extractedTitle = figcaption.props.children;
    }

    const code = pre?.props?.children;
    if (code && code.props && code.props.children) {
      codeString = Array.isArray(code.props.children)
        ? code.props.children.map((c: any) => c.props?.children || c).join("")
        : typeof code.props.children === "string"
        ? code.props.children
        : "";
    }
  } catch (e) {}

  const onCopy = () => {
    // Si rehype-pretty-code no expone texto plano fácil, el usuario lo puede seleccionar o 
    // lo re-procesamos. Aquí usamos el innerText si se llama al ref (en un mundo ideal).
    // Usaremos el string rudimentario por ahora o intentar usar JS para sacar innerText real.
    if (codeString) {
      navigator.clipboard.writeText(codeString)
    } else {
       // Buscar texto usando DOM temporal no ideal, pero shhhhh...
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Usar useEffect para copiar el codigo exacto renderizado por seguridad
  const containerRef = React.useRef<HTMLDivElement>(null)
  
  const handleCopy = () => {
     if (containerRef.current) {
        const pre = containerRef.current.querySelector("pre");
        if (pre) {
            navigator.clipboard.writeText(pre.innerText)
        }
     }
     setCopied(true)
     setTimeout(() => setCopied(false), 2000)
  }

  const renderContent = () => (
    <>
      <div
        className={cn(
          "group relative my-6 flex flex-col overflow-hidden rounded-lg ring-1 ring-zinc-800 bg-[#1e1e2e] dark:bg-[#1a1b26] shadow-lg",
          isFullscreen && "fixed inset-0 z-[9999] my-0 h-screen w-screen shadow-2xl rounded-none",
          showNumbers && "show-line-numbers",
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 bg-black/40 backdrop-blur-md px-4 py-2 text-zinc-400 select-none">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex gap-1.5 shrink-0">
              <div className="h-3 w-3 rounded-full bg-red-500/60" />
              <div className="h-3 w-3 rounded-full bg-amber-500/60" />
              <div className="h-3 w-3 rounded-full bg-emerald-500/60" />
            </div>
            
            {extractedTitle && (
              <div className="ml-2 truncate text-[10px] font-black uppercase tracking-widest text-zinc-300">
                {extractedTitle}
              </div>
            )}
            
            <div className="ml-4 flex gap-2 border-l border-zinc-800 pl-4 shrink-0 text-zinc-400">
              <button onClick={() => setZoomLevel(Math.max(0, zoomLevel - 1))} className="hover:text-zinc-200 transition-colors" title="Reducir">
                <ZoomOut size={14} />
              </button>
              <button onClick={() => setZoomLevel(Math.min(zoomClasses.length - 1, zoomLevel + 1))} className="hover:text-zinc-200 transition-colors" title="Ampliar">
                <ZoomIn size={14} />
              </button>
              <button 
                onClick={() => setShowNumbers(!showNumbers)} 
                className={cn("hover:text-zinc-200 transition-colors ml-2", showNumbers && "text-amber-500")} 
                title="Alternar numeración"
              >
                <Hash size={14} />
              </button>
            </div>
          </div>
          <div className="flex gap-3 text-zinc-400">
            <button onClick={handleCopy} className="hover:text-zinc-200 transition-colors" title="Copiar código">
              {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            </button>
            <button onClick={() => setIsFullscreen(!isFullscreen)} className="hover:text-zinc-200 transition-colors" title="Pantalla completa">
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          </div>
        </div>

        <div 
          ref={containerRef} 
          className={cn(
            "overflow-auto flex-1 w-full", 
            zoomClasses[zoomLevel], 
            "[&_pre]:!p-4 [&_pre]:!m-0 [&_figcaption]:hidden",
            "[&_code]:!bg-transparent [&_code]:!shadow-none [&_code]:!ring-0 [&_code]:!border-0",
            "prose-pre:!p-0"
          )}
          style={{ colorScheme: 'dark' }}
        >
          {children}
        </div>
      </div>
    </>
  )

  if (isFullscreen && mounted) {
    return createPortal(renderContent(), document.body)
  }

  return renderContent()
}
