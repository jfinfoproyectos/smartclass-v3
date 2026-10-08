"use client";

import React, { useState, useEffect, useRef } from "react";

export interface TextAnswerEditorProps {
    questionId?: string;
    initialValue: string;
    onAnswerChange: (val: string) => void;
    onSaveCurrent: () => void;
    disabled?: boolean;
    zoomLevel?: number;
    placeholder?: string;
}

export const TextAnswerEditor = React.memo(function TextAnswerEditor({
    initialValue,
    onAnswerChange,
    onSaveCurrent,
    disabled = false,
    zoomLevel = 1.0,
    placeholder = "Escribe tu respuesta detallada aquí...",
}: TextAnswerEditorProps) {
    const [localValue, setLocalValue] = useState(initialValue);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isFirstMountRef = useRef(true);

    // Auto-focus únicamente en el primer montaje si no está enviada
    useEffect(() => {
        if (!disabled && isFirstMountRef.current) {
            isFirstMountRef.current = false;
            textareaRef.current?.focus();
        }
    }, [disabled]);

    // Limpieza de debounce
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        // 1. Escritura 100% nativa sin interferencias (0ms de latencia)
        setLocalValue(val);

        // 2. Propagación debounced al estado del examen para auto-guardado en segundo plano
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
            onAnswerChange(val);
        }, 400);
    };

    const handleBlur = () => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        onAnswerChange(localValue);
        onSaveCurrent();
    };

    const handleFocus = () => {
        if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
            navigator.clipboard.writeText("No está permitido pegar contenido externo.").catch(() => {});
        }
    };

    return (
        <textarea
            ref={textareaRef}
            className="w-full h-full min-h-full flex-1 resize-none font-medium leading-relaxed bg-transparent border-0 outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 p-4 rounded-none shadow-none text-foreground placeholder:text-muted-foreground select-text cursor-text block"
            style={{ 
                fontSize: `${16 * zoomLevel}px`,
                height: "100%",
                minHeight: "100%",
                width: "100%",
                display: "block",
            }}
            placeholder={placeholder}
            value={localValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            readOnly={disabled}
            spellCheck={true}
            lang="es"
            autoComplete="on"
            autoCorrect="on"
        />
    );
});
