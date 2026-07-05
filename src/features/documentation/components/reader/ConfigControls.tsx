"use client";

import React from "react";
import { CodeThemeSelector } from "./CodeThemeSelector";
import { ModeToggle } from "@/components/theme/ModeToggle";
import { ThemeSelector } from "@/components/theme/ThemeSelector";
import { ThemeInfo } from "@/app/actions/themes";
import { CreditsModal } from "@/components/CreditsModal";

interface ConfigControlsProps {
  currentCodeTheme: string;
  themes: ThemeInfo[];
  courseSettings: {
    themeMode: string;
    codeTheme: string;
    allowCodeThemeChange: boolean;
    themeColor: string;
    allowThemeColorChange: boolean;
  };
}

export function ConfigControls({ currentCodeTheme, themes, courseSettings }: ConfigControlsProps) {
  const showModeToggle = courseSettings.themeMode === "STUDENT";
  const showCodeThemeSelector = courseSettings.allowCodeThemeChange;
  const showThemeSelector = courseSettings.allowThemeColorChange;

  const hasLeftControls = showThemeSelector || showCodeThemeSelector;
  const hasRightControls = showModeToggle;

  if (!hasLeftControls && !hasRightControls) return null;

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {showThemeSelector && <ThemeSelector themes={themes} />}
      {showCodeThemeSelector && <CodeThemeSelector currentTheme={currentCodeTheme} />}
      {showModeToggle && <ModeToggle />}
      <CreditsModal />
    </div>
  );
}
