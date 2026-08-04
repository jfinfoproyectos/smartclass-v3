"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  Send, 
  Bot, 
  Wand2, 
  CheckCircle2, 
  RefreshCw,
  Copy,
  Check,
  FileText,
  BookOpen,
  Lightbulb
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { generateAICanvasPromptAction } from "@/features/home/actions/aiCanvasActions";

interface AICanvasPromptAssistantProps {
  role?: string;
  className?: string;
}

const PROMPT_SUGGESTIONS = [
  { label: "Explicar concepto con IA", icon: Bot, prompt: "Explícame de forma didáctica los conceptos clave del módulo actual con ejemplos prácticos." },
  { label: "Crear sugerencia de examen", icon: FileText, prompt: "Genera 3 preguntas de opción múltiple para evaluar la lección de hoy." },
  { label: "Resumen de la clase", icon: BookOpen, prompt: "Crea un resumen de 5 puntos clave para la sesión actual." },
  { label: "Ideas para proyectos", icon: Lightbulb, prompt: "Propón 3 proyectos prácticos de nivel intermedio para estudiantes." }
];

export function AICanvasPromptAssistant({ role = "Estudiante", className }: AICanvasPromptAssistantProps) {
  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (queryText?: string) => {
    const textToSubmit = queryText || inputQuery;
    if (!textToSubmit.trim()) return;

    setIsLoading(true);
    setResponse(null);

    try {
      const realResult = await generateAICanvasPromptAction(textToSubmit);
      setResponse(realResult);
    } catch (err) {
      setResponse("Error al consultar AI Canvas. Por favor intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!response) return;
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("relative overflow-hidden rounded-3xl border border-emerald-500/20 dark:border-emerald-500/30 bg-gradient-to-b from-emerald-50/90 via-white to-slate-50 dark:from-slate-900/90 dark:via-slate-900 dark:to-slate-950 p-6 sm:p-8 shadow-md dark:shadow-xl text-foreground dark:text-white transition-colors duration-300", className)}>
      {/* Background Ambient Glow */}
      <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-teal-500/10 blur-3xl" />

      <div className="relative z-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-inner">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                AI Canvas Co-Pilot
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-500/30">
                  IA Activa
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Genera contenido, resúmenes y preguntas pedagógicas vinculadas a tus cursos reales.
              </p>
            </div>
          </div>
        </div>

        {/* Suggestion Chips with Clean Icons */}
        <div className="flex flex-wrap gap-2">
          {PROMPT_SUGGESTIONS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={() => {
                  setInputQuery(item.prompt);
                  handleSubmit(item.prompt);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 dark:bg-slate-800/80 dark:hover:bg-emerald-500/20 dark:text-slate-300 dark:hover:text-emerald-300 dark:border-slate-700/80 dark:hover:border-emerald-500/40 transition-all duration-200"
              >
                <Icon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Interactive Prompt Input Bar */}
        <div className="relative flex items-center">
          <Input
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Pregunta a la IA o describe qué deseas generar..."
            className="h-12 pl-4 pr-24 bg-white dark:bg-slate-950/80 border-slate-200 dark:border-slate-800 focus-visible:ring-emerald-500/40 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl shadow-inner"
          />
          <div className="absolute right-1.5 flex items-center gap-1">
            <Button
              size="sm"
              onClick={() => handleSubmit()}
              disabled={isLoading || !inputQuery.trim()}
              className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md transition-all"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Generar
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Response Box */}
        <AnimatePresence>
          {response && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="relative p-4 rounded-xl bg-emerald-50/70 dark:bg-slate-950/90 border border-emerald-200 dark:border-emerald-500/30 text-xs sm:text-sm text-slate-800 dark:text-slate-200 space-y-3"
            >
              <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 font-semibold border-b border-emerald-200/60 dark:border-slate-800 pb-2">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Resultado Generado por AI Canvas
                </span>
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copiado" : "Copiar"}
                </button>
              </div>
              <p className="whitespace-pre-line leading-relaxed text-slate-700 dark:text-slate-300">
                {response}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
