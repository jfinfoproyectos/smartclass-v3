"use client";

import * as React from "react";
import { Bell, BellRing, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWebPush } from "@/hooks/useWebPush";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

export function PushNotificationToggle() {
  const {
    isSubscribed,
    permission,
    loading,
    subscribe,
    unsubscribe,
  } = useWebPush();

  const handleToggle = async () => {
    if (loading) return;

    if (permission === "unsupported") {
      toast.error("Notificaciones no soportadas", {
        description: "Tu navegador no soporta recibir notificaciones push.",
      });
      return;
    }

    if (permission === "denied") {
      toast.warning("Acceso Bloqueado", {
        description: "Habilita las notificaciones en la barra de direcciones del navegador.",
      });
      return;
    }

    try {
      if (isSubscribed) {
        await unsubscribe();
        toast.success("Notificaciones Desactivadas", {
          description: "Ya no recibirás alertas en este dispositivo.",
        });
      } else {
        await subscribe();
        toast.success("¡Notificaciones Activadas!", {
          description: "Recibirás alertas sobre asistencia, calificaciones y anotaciones.",
        });
      }
    } catch (err: any) {
      console.error("Error toggling push notifications:", err);
      toast.error("Error de Configuración", {
        description: err.message || "No se pudo actualizar la suscripción.",
      });
    }
  };

  // Icon rendering depending on state
  const getIcon = () => {
    if (loading) {
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    }
    if (permission === "unsupported" || permission === "denied") {
      return <BellOff className="h-4 w-4 text-muted-foreground/60 transition-colors" />;
    }
    if (isSubscribed) {
      return (
        <span className="relative flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/40 opacity-75"></span>
          <BellRing className="relative inline-flex h-4 w-4 text-primary transition-colors" />
        </span>
      );
    }
    return <Bell className="h-4 w-4 text-foreground/85 hover:text-foreground transition-colors" />;
  };

  // Tooltip content depending on state
  const getTooltipText = () => {
    if (loading) return "Cargando estado de notificaciones...";
    if (permission === "unsupported") return "Notificaciones push no soportadas en este navegador";
    if (permission === "denied") return "Notificaciones denegadas. Habilítalas en el candado del navegador";
    if (isSubscribed) return "Desactivar Notificaciones Push";
    return "Activar Notificaciones Push";
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggle}
            disabled={loading}
            className="h-9 w-9 rounded-md transition-all duration-200 hover:bg-accent hover:text-accent-foreground relative"
            aria-label="Configurar notificaciones push"
          >
            {getIcon()}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="center" className="max-w-[240px] text-center text-xs">
          <p>{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
