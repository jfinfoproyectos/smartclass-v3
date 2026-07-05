"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Componente que soluciona problemas de scroll bloqueado en Next.js.
 * Radix UI (usado por Shadcn) a veces falla en restaurar el scroll del body
 * después de cerrar diálogos o navegar, especialmente con Server Actions.
 */
export function ScrollRestorer() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const restoreScroll = () => {
        // Solo restauramos si NO hay diálogos, sheets o menús abiertos en el DOM
        // Esto evita romper la funcionalidad de Radix mientras un modal está activo
        const activeOverlays = document.querySelectorAll(
            '[role="dialog"], [role="menu"], [data-radix-portal], .radix-portal'
        );

        if (activeOverlays.length === 0) {
            if (document.body.style.overflow === "hidden" || 
                document.body.style.pointerEvents === "none" ||
                document.body.hasAttribute("data-scroll-locked")) {
                
                document.body.style.overflow = "";
                document.body.style.pointerEvents = "";
                document.body.style.paddingRight = "";
                document.body.removeAttribute("data-scroll-locked");
                
                // También limpiar el elemento html por si acaso
                document.documentElement.style.overflow = "";
            }
        }
    };

    useEffect(() => {
        // Restaurar en cada navegación
        restoreScroll();
        
        // Pequeño delay para asegurar que las animaciones de cierre terminaron
        const timeoutId = setTimeout(restoreScroll, 100);
        return () => clearTimeout(timeoutId);
    }, [pathname, searchParams]);

    useEffect(() => {
        // Observador para detectar cuando Radix añade estilos al body sin que haya un modal visible
        const observer = new MutationObserver(() => {
            // Usamos un pequeño delay porque Radix añade los estilos justo antes de mostrar el modal
            setTimeout(restoreScroll, 50);
        });

        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ["style", "data-scroll-locked"]
        });

        return () => observer.disconnect();
    }, []);

    return null;
}
