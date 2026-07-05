"use client";

import { useState, useEffect } from "react";
import { WifiOff, AlertCircle, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

export function NetworkStatus() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Inicializar estado
    setIsOffline(!navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-md"
        >
          <div className="bg-destructive text-destructive-foreground p-4 rounded-2xl shadow-2xl border border-white/10 backdrop-blur-md flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <WifiOff className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black uppercase tracking-tight">Sin conexión a internet</span>
                <span className="text-[10px] font-medium opacity-80 uppercase tracking-widest">Algunas funciones podrían no estar disponibles</span>
              </div>
            </div>
            
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => window.location.reload()}
              className="w-full h-10 rounded-xl font-bold uppercase tracking-widest text-[10px] gap-2 bg-white text-destructive hover:bg-white/90 transition-all"
            >
              <RefreshCw className="w-3 h-3" />
              Reintentar Conexión
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
