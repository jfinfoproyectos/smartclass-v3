"use client";

import React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDurationHMS, formatDurationHuman } from "@/lib/dateUtils";

export interface EvaluationTabSwitchesModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tabSwitchesCount: number;
    totalTimeAwaySeconds: number;
    maxExitTimeSeconds: number;
    hasExitTimeAlert: boolean;
    tabSwitchLogs: Array<{ id?: string; leftAt?: string; durationSeconds: number }>;
}

export function EvaluationTabSwitchesModal({
    open,
    onOpenChange,
    tabSwitchesCount,
    totalTimeAwaySeconds,
    maxExitTimeSeconds,
    hasExitTimeAlert,
    tabSwitchLogs,
}: EvaluationTabSwitchesModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base font-bold">
                        <ExternalLink className="w-5 h-5 text-amber-500" />
                        <span>Registro de Navegación Externa</span>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                        Historial de veces que saliste a otras ventanas o pestañas del navegador durante el examen. Esta información queda registrada para el docente.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-2 max-h-72 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-2 p-3 bg-muted/40 rounded-xl border text-center">
                        <div>
                            <span className="text-[10px] text-muted-foreground uppercase font-bold">Total Salidas</span>
                            <p className="text-xl font-black text-amber-600 dark:text-amber-400">{tabSwitchesCount}</p>
                        </div>
                        <div>
                            <span className="text-[10px] text-muted-foreground uppercase font-bold">Tiempo Acumulado Fuera</span>
                            <p className={cn("text-xl font-black font-mono", hasExitTimeAlert ? "text-red-600 dark:text-red-400" : "text-foreground")}>{formatDurationHMS(totalTimeAwaySeconds)}</p>
                            <span className="text-[11px] text-muted-foreground font-medium">{formatDurationHuman(totalTimeAwaySeconds)}</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 border text-xs">
                        <span className="text-muted-foreground">Límite antes de alerta docente:</span>
                        <span className="font-mono font-bold text-foreground">{Math.max(1, Math.round(maxExitTimeSeconds / 60))} min</span>
                    </div>
                    {hasExitTimeAlert && (
                        <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>Has superado el tiempo máximo acumulado permitido fuera de la evaluación. Alerta registrada.</span>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        {tabSwitchLogs.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-4">No se han registrado salidas de la pestaña.</p>
                        ) : (
                            tabSwitchLogs.slice().reverse().map((log, idx) => (
                                <div key={log.id || idx} className="p-2.5 rounded-lg border bg-card flex items-center justify-between text-xs">
                                    <div className="space-y-0.5">
                                        <span className="font-bold text-foreground">Salida #{tabSwitchLogs.length - idx}</span>
                                        <p className="text-[11px] text-muted-foreground">
                                            {log.leftAt ? format(new Date(log.leftAt), "HH:mm:ss", { locale: es }) : "—"}
                                        </p>
                                    </div>
                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-mono font-bold">
                                        {log.durationSeconds}s fuera
                                    </Badge>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        className="w-full text-xs font-semibold cursor-pointer"
                    >
                        Entendido / Cerrar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
