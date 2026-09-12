"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface GradingModeSelectorProps {
    gradingMode: "normal" | "moderate" | "strict";
    setGradingMode: (mode: "normal" | "moderate" | "strict") => void;
    className?: string;
    showWarning?: boolean;
    hideLabel?: boolean;
}

export function GradingModeSelector({ 
    gradingMode, 
    setGradingMode, 
    className, 
    showWarning = true,
    hideLabel = false 
}: GradingModeSelectorProps) {
    return (
        <div className={cn("flex flex-col gap-1.5", className)}>
            {!hideLabel && (
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Nivel de Exigencia IA
                </Label>
            )}
            <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-full border border-muted">
                {(['normal', 'moderate', 'strict'] as const).map((mode) => (
                    <Button 
                        key={mode}
                        type="button"
                        variant={gradingMode === mode ? "secondary" : "ghost"} 
                        size="sm" 
                        className={`flex-1 h-8 text-[11px] capitalize transition-all ${
                            gradingMode === mode 
                                ? "bg-white dark:bg-background shadow-sm font-semibold text-primary" 
                                : "text-muted-foreground hover:text-foreground"
                        }`} 
                        onClick={() => setGradingMode(mode)}
                    >
                        {mode === 'normal' ? 'Normal' : mode === 'moderate' ? 'Moderado' : 'Estricto'}
                    </Button>
                ))}
            </div>
            {showWarning && gradingMode === 'strict' && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                    ⚠️ Modo Estricto: Penalización rigurosa en fallos de arquitectura y buenas prácticas.
                </p>
            )}
        </div>
    );
}
