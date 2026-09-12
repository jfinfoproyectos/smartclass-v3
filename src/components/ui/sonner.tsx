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
  const [mounted, setMounted] = useState(false)
  const [isDark, setIsDark] = useState(false)

  // Sincronización en tiempo real con la clase 'dark' del elemento raíz HTML
  useEffect(() => {
    setMounted(true)
    const checkDark = () => {
      const dark = document.documentElement.classList.contains("dark")
      setIsDark(dark)
    }

    checkDark()

    const observer = new MutationObserver(() => {
      checkDark()
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    window.addEventListener("smartclass-theme-changed", checkDark)

    return () => {
      observer.disconnect()
      window.removeEventListener("smartclass-theme-changed", checkDark)
    }
  }, [])

  // Determinar el modo activo real ('dark' o 'light') garantizando consistencia absoluta
  const activeThemeMode: ToasterProps["theme"] = mounted
    ? (isDark ? "dark" : "light")
    : (resolvedTheme === "dark" || theme === "dark" ? "dark" : "light")

  return (
    <Sonner
      theme={activeThemeMode}
      className="toaster group"
      richColors
      closeButton
      icons={{
        success: <CircleCheck className="size-4.5 text-emerald-500 shrink-0" />,
        info: <Info className="size-4.5 text-sky-500 shrink-0" />,
        warning: <AlertTriangle className="size-4.5 text-amber-500 shrink-0" />,
        error: <AlertCircle className="size-4.5 text-rose-500 shrink-0" />,
        loading: <Loader2 className="size-4.5 animate-spin text-primary shrink-0" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:shadow-xl group-[.toaster]:rounded-2xl group-[.toaster]:border group-[.toaster]:font-sans group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-xs group-[.toaster]:font-medium group-[.toaster]:py-3.5 group-[.toaster]:px-4 group-[.toaster]:gap-3 group-[.toaster]:transition-all dark:group-[.toaster]:shadow-black/50",
          title: "font-semibold text-xs tracking-tight group-[.toast]:text-inherit",
          description: "group-[.toast]:text-inherit opacity-90 text-[11px] leading-relaxed",
          actionButton:
            "!bg-primary !text-primary-foreground font-semibold rounded-xl text-xs px-3 py-1.5 shadow-xs hover:opacity-90 transition-opacity",
          cancelButton:
            "!bg-muted !text-muted-foreground font-medium rounded-xl text-xs px-3 py-1.5 hover:bg-muted/80",
          closeButton:
            "!border-border/60 !bg-card/90 dark:!bg-zinc-800/90 hover:!bg-muted text-muted-foreground hover:text-foreground transition-all !rounded-full shadow-2xs",
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

