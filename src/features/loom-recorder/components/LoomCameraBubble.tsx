"use client";

import { useEffect, useRef, useState } from "react";
import { 
    Maximize2, 
    Minimize2, 
    FlipHorizontal, 
    VideoOff, 
    Move, 
    User,
    Sparkles
} from "lucide-react";
import { BubblePosition, BubbleSize } from "../types";

interface LoomCameraBubbleProps {
    stream: MediaStream | null;
    position: BubblePosition;
    size: BubbleSize;
    isMirrored: boolean;
    isRecording: boolean;
    instructorName?: string;
    onPositionChange: (pos: BubblePosition) => void;
    onSizeChange: (size: BubbleSize) => void;
    onMirrorToggle: () => void;
    isDraggable?: boolean;
}

export function LoomCameraBubble({
    stream,
    position,
    size,
    isMirrored,
    isRecording,
    instructorName = "Docente",
    onPositionChange,
    onSizeChange,
    onMirrorToggle,
}: LoomCameraBubbleProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        if (videoRef.current && stream) {
            if (videoRef.current.srcObject !== stream) {
                videoRef.current.srcObject = stream;
            }
        }
    }, [stream]);

    // Calcular tamaño en píxeles
    const sizeMap: Record<BubbleSize, string> = {
        sm: "w-28 h-28 sm:w-36 sm:h-36",
        md: "w-40 h-40 sm:w-48 sm:h-48",
        lg: "w-56 h-56 sm:w-64 sm:h-64",
    };

    // Posición fija en pantalla
    const positionMap: Record<BubblePosition, string> = {
        "bottom-left": "bottom-6 left-20",
        "bottom-right": "bottom-6 right-6",
        "top-left": "top-6 left-20",
        "top-right": "top-6 right-6",
    };

    const nextPosition: Record<BubblePosition, BubblePosition> = {
        "bottom-left": "bottom-right",
        "bottom-right": "top-right",
        "top-right": "top-left",
        "top-left": "bottom-left",
    };

    const nextSize: Record<BubbleSize, BubbleSize> = {
        sm: "md",
        md: "lg",
        lg: "sm",
    };

    return (
        <div 
            className={`fixed z-50 ${positionMap[position]} transition-all duration-300 ease-out select-none`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className={`relative ${sizeMap[size]} rounded-full overflow-hidden shadow-2xl border-4 ${isRecording ? "border-purple-500 shadow-purple-500/30" : "border-white/80 shadow-black/30"} bg-slate-900 group transition-transform duration-200 hover:scale-[1.02]`}>
                {stream ? (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover transition-transform ${isMirrored ? "-scale-x-100" : ""}`}
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-slate-900 via-purple-950 to-slate-900 text-white p-3 text-center">
                        <User className="w-10 h-10 text-purple-300 mb-1" />
                        <span className="text-xs font-bold truncate max-w-[90%]">
                            {instructorName}
                        </span>
                    </div>
                )}

                {/* Resplandor elegante estático durante la grabación sin parpadeo */}
                {isRecording && (
                    <div className="absolute inset-0 rounded-full border-2 border-purple-400/80 pointer-events-none shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
                )}

                {/* Overlays y controles al hacer hover sobre la burbuja */}
                <div className={`absolute inset-0 bg-black/60 backdrop-blur-xs rounded-full flex flex-col items-center justify-center gap-2 transition-opacity duration-200 ${isHovered ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                    <div className="flex items-center gap-2">
                        {/* Cambiar tamaño */}
                        <button
                            type="button"
                            onClick={() => onSizeChange(nextSize[size])}
                            className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white cursor-pointer active:scale-95 transition-all"
                            title="Cambiar tamaño"
                        >
                            <Maximize2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Mover a siguiente esquina */}
                        <button
                            type="button"
                            onClick={() => onPositionChange(nextPosition[position])}
                            className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white cursor-pointer active:scale-95 transition-all"
                            title="Mover a otra esquina"
                        >
                            <Move className="w-3.5 h-3.5" />
                        </button>

                        {/* Espejo */}
                        <button
                            type="button"
                            onClick={onMirrorToggle}
                            className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white cursor-pointer active:scale-95 transition-all"
                            title="Efecto espejo"
                        >
                            <FlipHorizontal className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <span className="text-[10px] font-bold text-white/80 uppercase tracking-widest">
                        {size}
                    </span>
                </div>
            </div>
        </div>
    );
}
