"use client";

import { useState } from "react";
import { 
    Square, 
    Pause, 
    Play, 
    RotateCcw, 
    Trash2, 
    GripVertical,
    Check,
    ExternalLink
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface LoomFloatingControlsProps {
    duration: number; // in seconds
    isPaused: boolean;
    onStop: () => void;
    onPauseToggle: () => void;
    onRestart: () => void;
    onDiscard: () => void;
    onTogglePiP?: () => void;
    isPiPActive?: boolean;
}

export function LoomFloatingControls({
    duration,
    isPaused,
    onStop,
    onPauseToggle,
    onRestart,
    onDiscard,
    onTogglePiP,
    isPiPActive = false,
}: LoomFloatingControlsProps) {
    const [confirmDiscard, setConfirmDiscard] = useState(false);

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    return (
        <TooltipProvider delayDuration={150}>
            <div 
                className="fixed left-6 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center bg-slate-950/90 text-white backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl p-2 gap-2 select-none animate-in slide-in-from-left-6 duration-300"
            >
                {/* Drag handle */}
                <div className="text-white/40 hover:text-white/80 cursor-grab active:cursor-grabbing pb-0.5">
                    <GripVertical className="w-3.5 h-3.5" />
                </div>

                {/* Botón Stop / Finalizar grabación */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            onClick={onStop}
                            className="w-10 h-10 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 flex items-center justify-center transition-all shadow-lg shadow-red-600/30 cursor-pointer group"
                        >
                            <Square className="w-4 h-4 fill-white text-white group-hover:scale-90 transition-transform" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-slate-900 text-white text-xs font-semibold border-white/10">
                        Terminar y guardar grabación
                    </TooltipContent>
                </Tooltip>

                {/* Temporizador digital */}
                <div className="flex flex-col items-center py-1">
                    <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${isPaused ? "bg-amber-400" : "bg-red-500 animate-ping"}`} />
                        <span className="font-mono text-xs font-black tracking-tight text-white">
                            {formatTime(duration)}
                        </span>
                    </div>
                    {isPaused && (
                        <span className="text-[9px] uppercase font-bold text-amber-400 tracking-wider">
                            Pausado
                        </span>
                    )}
                </div>

                <div className="w-6 h-[1px] bg-white/15 my-0.5" />



                {/* Botón Ventana Flotante Always-on-top (PiP) */}
                {onTogglePiP && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                onClick={onTogglePiP}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                                    isPiPActive 
                                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/30" 
                                        : "bg-white/10 hover:bg-white/20 text-white/90 hover:text-white active:scale-95"
                                }`}
                            >
                                <ExternalLink className="w-4 h-4" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-slate-900 text-white text-xs font-semibold border-white/10">
                            {isPiPActive ? "Cerrar ventana flotante PiP" : "Abrir flotante sobre otras apps (PiP)"}
                        </TooltipContent>
                    </Tooltip>
                )}

                {/* Pausar / Reanudar */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            onClick={onPauseToggle}
                            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                        >
                            {isPaused ? <Play className="w-4 h-4 fill-current ml-0.5" /> : <Pause className="w-4 h-4" />}
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-slate-900 text-white text-xs font-semibold border-white/10">
                        {isPaused ? "Reanudar grabación" : "Pausar grabación"}
                    </TooltipContent>
                </Tooltip>

                {/* Reiniciar grabación */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            onClick={onRestart}
                            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-slate-900 text-white text-xs font-semibold border-white/10">
                        Reiniciar desde cero
                    </TooltipContent>
                </Tooltip>

                {/* Descartar / Basura */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        {confirmDiscard ? (
                            <button
                                type="button"
                                onClick={onDiscard}
                                onMouseLeave={() => setConfirmDiscard(false)}
                                className="w-9 h-9 rounded-xl bg-red-600/90 hover:bg-red-600 text-white flex items-center justify-center transition-all cursor-pointer animate-in zoom-in-75 duration-150"
                                title="¿Confirmar descarte?"
                            >
                                <Check className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setConfirmDiscard(true)}
                                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-red-500/20 active:scale-95 text-white/70 hover:text-red-400 flex items-center justify-center transition-all cursor-pointer"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-slate-900 text-white text-xs font-semibold border-white/10">
                        {confirmDiscard ? "Clic para confirmar descartar" : "Descartar grabación"}
                    </TooltipContent>
                </Tooltip>
            </div>
        </TooltipProvider>
    );
}
