"use client";

import { useEffect, useState } from "react";

interface LoomCountdownOverlayProps {
    duration: number; // default 3
    onFinish: () => void;
    onCancel?: () => void;
}

export function LoomCountdownOverlay({ duration = 3, onFinish, onCancel }: LoomCountdownOverlayProps) {
    const [count, setCount] = useState(duration);

    useEffect(() => {
        if (count <= 0) {
            onFinish();
            return;
        }

        const timer = setTimeout(() => {
            setCount((prev) => prev - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [count, onFinish]);

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/75 backdrop-blur-md select-none animate-in fade-in-50 duration-200">
            <div className="relative flex flex-col items-center">
                {/* Círculo pulsante */}
                <div className="w-48 h-48 rounded-full border-4 border-orange-500/40 flex items-center justify-center bg-orange-500/10 shadow-[0_0_80px_rgba(249,115,22,0.3)] animate-pulse">
                    <span 
                        key={count} 
                        className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-tr from-orange-400 via-rose-500 to-purple-500 animate-in zoom-in-50 duration-300"
                    >
                        {count > 0 ? count : "¡Grabando!"}
                    </span>
                </div>

                <p className="mt-8 text-sm font-semibold tracking-wide text-white/80">
                    Prepárate para comenzar tu explicación...
                </p>

                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="mt-6 px-4 py-1.5 rounded-full text-xs font-medium text-white/60 hover:text-white bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
                    >
                        Cancelar
                    </button>
                )}
            </div>
        </div>
    );
}
