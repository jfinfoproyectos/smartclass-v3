"use client";

import { useEffect, useRef, useState } from "react";
import { Eye } from "lucide-react";
import { recordPageViewAction, updatePageProgressAction } from "../../actions/progressActions";

interface DocTrackerProps {
  pageId: string;
}

export function DocTracker({ pageId }: DocTrackerProps) {
  const [viewCount, setViewCount] = useState<number>(0);
  const activeTimeRef = useRef<number>(0);
  const lastActivityRef = useRef<number>(Date.now());
  const IDLE_THRESHOLD = 60 * 1000; // 1 minuto de inactividad

  useEffect(() => {
    // 1. Registrar vista inicial y obtener conteo (si aplica)
    recordPageViewAction(pageId);
    
    activeTimeRef.current = 0;
    lastActivityRef.current = Date.now();

    // 2. Detectores de actividad
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("scroll", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("click", handleActivity);

    // 3. Tick de precisión (cada 1s) para acumular tiempo activo
    const tickInterval = setInterval(() => {
      const now = Date.now();
      const isUserActive = (now - lastActivityRef.current) < IDLE_THRESHOLD;
      
      if (isUserActive) {
        activeTimeRef.current += 1;
      }
    }, 1000);

    // Cleanup
    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
      
      clearInterval(tickInterval);
      
      // Guardar tiempo final acumulado
      if (activeTimeRef.current > 5) {
        updatePageProgressAction(pageId, activeTimeRef.current);
      }
    };
  }, [pageId]);

  return (
    <div 
      className="h-24 w-full mt-20 flex flex-col items-center justify-center border-t border-dashed border-border/20 gap-3"
    >
      <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground/10 select-none">
        Fin del Contenido
      </span>
    </div>
  );
}
