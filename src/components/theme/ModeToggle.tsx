"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { updateUserVisualSettingsAction } from "@/app/actions/settings"
import { cn } from "@/lib/utils"

export function ModeToggle({ asMenuItem, className }: { asMenuItem?: boolean; className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const activeMode = theme === "system" ? resolvedTheme : theme;

  const toggle = React.useCallback(() => {
    const current = theme === "system" ? resolvedTheme : theme;
    const nextMode = current === "dark" ? "light" : "dark";
    setTheme(nextMode);
    updateUserVisualSettingsAction({ appThemeMode: nextMode.toUpperCase() }).catch((err) => {
      console.error("Failed to persist theme mode to DB:", err);
    });
  }, [theme, resolvedTheme, setTheme]);

  if (!mounted) {
    if (asMenuItem) {
      return (
        <DropdownMenuItem className="cursor-pointer text-xs">
          <Sun className="mr-2 h-4 w-4" />
          <span>Tema</span>
        </DropdownMenuItem>
      );
    }
    return (
      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg shrink-0 opacity-50">
        <Sun className="h-3.5 w-3.5" />
      </Button>
    );
  }

  if (asMenuItem) {
    return (
      <DropdownMenuItem onClick={toggle} className="cursor-pointer text-xs">
        {activeMode === "dark" ? (
          <>
            <Sun className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Modo Claro</span>
          </>
        ) : (
          <>
            <Moon className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Modo Oscuro</span>
          </>
        )}
      </DropdownMenuItem>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggle} 
          aria-label="Cambiar modo" 
          className={cn(
            "h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/90 dark:hover:bg-accent/70 hover:shadow-2xs transition-all", 
            className
          )}
        >
          <Sun className="h-3.5 w-3.5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute h-3.5 w-3.5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Modo</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <p>{activeMode === "dark" ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}</p>
      </TooltipContent>
    </Tooltip>
  )
}
