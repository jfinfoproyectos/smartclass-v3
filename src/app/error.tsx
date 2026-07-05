"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home, WifiOff } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error);
  }, [error]);

  const isNetworkError = 
    error.message?.toLowerCase().includes("fetch") || 
    error.message?.toLowerCase().includes("network") ||
    error.message?.toLowerCase().includes("failed to fetch") ||
    error.message?.toLowerCase().includes("session") ||
    error.message?.toLowerCase().includes("prisma") ||
    error.message?.toLowerCase().includes("database") ||
    error.message?.toLowerCase().includes("reach database") ||
    error.message?.toLowerCase().includes("connection") ||
    !navigator.onLine;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background text-center">
      <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
            <div className="relative bg-muted/50 p-6 rounded-3xl border border-border/50">
              {isNetworkError ? (
                <WifiOff className="w-12 h-12 text-primary" />
              ) : (
                <AlertTriangle className="w-12 h-12 text-destructive" />
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-black uppercase tracking-tight">
              {isNetworkError ? "Error de Conexión" : "Algo salió mal"}
            </h1>
            <p className="text-muted-foreground text-sm font-medium max-w-xs mx-auto">
              {isNetworkError 
                ? "No pudimos conectar con el servidor. Por favor, verifica tu conexión a internet e intenta de nuevo."
                : "Se ha producido un error inesperado en la aplicación. Hemos sido notificados y estamos trabajando en ello."}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={() => reset()}
            className="h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reintentar ahora
          </Button>
          
          <div className="flex gap-3">
            <Button
              asChild
              variant="outline"
              className="flex-1 h-12 rounded-2xl font-bold uppercase tracking-widest text-[10px] border-border/50 hover:bg-muted transition-all"
            >
              <Link href="/dashboard">
                <Home className="w-3.5 h-3.5 mr-2" />
                Panel de Control
              </Link>
            </Button>
          </div>
        </div>

        {process.env.NODE_ENV === "development" && (
          <div className="mt-8 p-4 bg-muted/30 rounded-xl border border-border/50 text-left overflow-auto max-h-48 custom-scrollbar">
            <p className="text-[10px] font-mono text-muted-foreground break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-[10px] font-mono text-primary mt-2">
                Digest: {error.digest}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
