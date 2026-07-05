"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface CodeZoomContextType {
  zoomLevel: number;
  setZoomLevel: (level: number) => void;
  zoomClasses: string[];
}

const zoomClasses = [
  "text-[10px]",
  "text-xs",
  "text-sm",
  "text-base",
  "text-lg",
  "text-xl",
  "text-2xl",
  "text-3xl",
  "text-4xl"
];

const CodeZoomContext = createContext<CodeZoomContextType | undefined>(undefined);

export function CodeZoomProvider({ children }: { children: React.ReactNode }) {
  const [zoomLevel, setZoomLevelState] = useState(2); // Default to text-sm

  // Persist zoom level in localStorage
  useEffect(() => {
    const saved = localStorage.getItem("code-zoom-level");
    if (saved) {
      const level = parseInt(saved);
      if (!isNaN(level) && level >= 0 && level < zoomClasses.length) {
        setZoomLevelState(level);
      }
    }
  }, []);

  const setZoomLevel = (level: number) => {
    setZoomLevelState(level);
    localStorage.setItem("code-zoom-level", level.toString());
  };

  return (
    <CodeZoomContext.Provider value={{ zoomLevel, setZoomLevel, zoomClasses }}>
      {children}
    </CodeZoomContext.Provider>
  );
}

export function useCodeZoom() {
  const context = useContext(CodeZoomContext);
  if (!context) {
    // Return defaults if not in provider (to avoid crashes)
    return { 
      zoomLevel: 2, 
      setZoomLevel: () => {}, 
      zoomClasses 
    };
  }
  return context;
}
