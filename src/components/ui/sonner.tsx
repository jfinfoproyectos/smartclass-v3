"use client"

import { useEffect, useState } from "react"
import {
  CircleCheck,
  Info,
  Loader2,
  AlertCircle,
  AlertTriangle,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system", resolvedTheme } = useTheme()
  const [, setForceUpdate] = useState(0)

  // Escuchar cambios dinámicos de paleta de colores de la aplicación
  useEffect(() => {
    const handleThemeChange = () => setForceUpdate((n) => n + 1)
    window.addEventListener("smartclass-theme-changed", handleThemeChange)
    return () => {
      window.removeEventListener("smartclass-theme-changed", handleThemeChange)
    }
  }, [])

  // Determinar el modo activo real ('dark' o 'light') garantizando consistencia absoluta
  const activeThemeMode = (resolvedTheme || (theme === "system" ? "light" : theme) || "light") as ToasterProps["theme"]

  return (
    <Sonner
      theme={activeThemeMode}
      className="toaster group"
      richColors
      closeButton
      icons={{
        success: <CircleCheck className="size-4.5 text-emerald-500 shrink-0" />,
        info: <Info className="size-4.5 text-primary shrink-0" />,
        warning: <AlertTriangle className="size-4.5 text-amber-500 shrink-0" />,
        error: <AlertCircle className="size-4.5 text-destructive shrink-0" />,
        loading: <Loader2 className="size-4.5 animate-spin text-primary shrink-0" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:shadow-2xl group-[.toaster]:rounded-2xl group-[.toaster]:border group-[.toaster]:font-sans group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-xs group-[.toaster]:font-medium group-[.toaster]:py-3.5 group-[.toaster]:px-4 group-[.toaster]:gap-3 group-[.toaster]:transition-all",
          title: "font-semibold text-xs tracking-tight text-foreground group-[.toast]:text-inherit",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-[11px] leading-relaxed group-[.toast]:text-inherit",
          actionButton:
            "!bg-primary !text-primary-foreground font-semibold rounded-xl text-xs px-3 py-1.5 shadow-xs hover:opacity-90 transition-opacity",
          cancelButton:
            "!bg-muted !text-muted-foreground font-medium rounded-xl text-xs px-3 py-1.5 hover:bg-muted/80",
          closeButton:
            "!border-border/60 !bg-card/80 hover:!bg-muted text-muted-foreground hover:text-foreground transition-all !rounded-full shadow-2xs",
        },
      }}
      style={
        {
          "--normal-bg": "var(--card)",
          "--normal-text": "var(--card-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius, 1rem)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
