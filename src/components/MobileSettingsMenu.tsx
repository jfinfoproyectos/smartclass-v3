"use client";

import { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeSelector } from "@/components/theme/ThemeSelector";
import { ModeToggle } from "@/components/theme/ModeToggle";
import { PaperModeToggle } from "@/components/theme/PaperModeToggle";
import { PushNotificationToggle } from "@/components/notification/PushNotificationToggle";
import { CreditsModal } from "@/components/CreditsModal";

interface MobileSettingsMenuProps {
  themes: any[];
  showThemeSelector: boolean;
  showModeToggle: boolean;
}

export function MobileSettingsMenu({ themes, showThemeSelector, showModeToggle }: MobileSettingsMenuProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-50">
        <Settings className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-60 hover:opacity-100 transition-all">
          <Settings className="h-4 w-4" />
          <span className="sr-only">Ajustes</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-background/80 backdrop-blur-md border-border/50">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest opacity-50">Preferencias</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {showThemeSelector && (
          <ThemeSelector themes={themes} asSubMenu={true} />
        )}
        
        {showModeToggle && (
          <ModeToggle asMenuItem={true} />
        )}
        
        <div className="px-2 py-1.5 flex items-center justify-between">
          <span className="text-xs font-medium">Modo Papel</span>
          <PaperModeToggle />
        </div>
        
        <PushNotificationToggle asMenuItem={true} />
        
        <DropdownMenuSeparator />
        
        <CreditsModal asMenuItem={true} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
