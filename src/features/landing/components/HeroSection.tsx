"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  BrainCircuit,
  Sparkles,
  ArrowRight,
  Code2,
  CalendarCheck,
  GraduationCap,
  BarChart3,
  Bot,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AICanvasCard } from "@/components/ui/ai-canvas-card";
import { authClient } from "@/lib/auth-client";

export function HeroSection() {
  const { data: session } = authClient.useSession();
  const isLoggedIn = !!session?.user;
  const targetAuthUrl = isLoggedIn ? "/dashboard" : "/signin";

  const features = [
    {
      title: "Evaluación de Código con IA",
      description: "Calificación automática de ejecuciones en tiempo real con Gemini, OpenAI y modelos de IA pedagógicos.",
      icon: Code2,
      badge: "IA Automática",
      badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      accentColor: "from-emerald-500/30 via-teal-500/20 to-transparent",
      iconBgColor: "bg-emerald-500/10",
      iconTextColor: "text-emerald-400",
    },
    {
      title: "Control de Asistencia Inteligente",
      description: "Generación de códigos QR temporales y listas automatizadas para control diario de estudiantes.",
      icon: CalendarCheck,
      badge: "Asistencia",
      badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      accentColor: "from-blue-500/30 via-cyan-500/20 to-transparent",
      iconBgColor: "bg-blue-500/10",
      iconTextColor: "text-blue-400",
    },
    {
      title: "Gestión Académica Completa",
      description: "Organización de cursos, asignaturas, estudiantes y roles docentes desde un único panel centralizado.",
      icon: GraduationCap,
      badge: "Administración",
      badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      accentColor: "from-purple-500/30 via-pink-500/20 to-transparent",
      iconBgColor: "bg-purple-500/10",
      iconTextColor: "text-purple-400",
    },
    {
      title: "Analítica & Reportes PDF / Excel",
      description: "Estadísticas detalladas de rendimiento académico, tasa de aprobación y exportación multiformato.",
      icon: BarChart3,
      badge: "Analítica",
      badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      accentColor: "from-amber-500/30 via-orange-500/20 to-transparent",
      iconBgColor: "bg-amber-500/10",
      iconTextColor: "text-amber-400",
    },
  ];

  const aiModels = [
    { name: "Google Gemini", version: "2.5 & 1.5 Pro" },
    { name: "OpenAI GPT-4o", version: "Codex & Chat" },
    { name: "DeepSeek R1", version: "Razonamiento" },
    { name: "Anthropic Claude", version: "3.5 Sonnet" },
  ];

  return (
    <div className="relative min-h-screen bg-slate-950 text-white overflow-hidden selection:bg-emerald-500 selection:text-slate-950">
      {/* Ambient Lighting & Canvas Gradients */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-tr from-emerald-500/20 via-teal-500/10 to-cyan-500/0 blur-[120px] opacity-70 animate-pulse" />
      <div className="pointer-events-none absolute top-1/3 -right-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-blue-500/15 via-indigo-500/5 to-transparent blur-[140px]" />
      
      {/* Subtle Background Grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
      />

      {/* Navigation Header */}
      <header className="relative z-20 border-b border-white/10 backdrop-blur-md bg-slate-950/60 sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-extrabold text-xl tracking-tight">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-300">
              SmartClass <span className="text-emerald-400 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 ml-1">v3</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Button size="sm" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold shadow-lg shadow-emerald-500/20 border-none" asChild>
              <Link href={targetAuthUrl}>
                <LogIn className="w-4 h-4 mr-1.5" />
                {isLoggedIn ? "Ir al Dashboard" : "Iniciar Sesión"}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Content Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-16 md:pt-24 pb-20 text-center space-y-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 backdrop-blur-md"
        >
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>Sistema de Gestión Académica e Inteligencia Artificial</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="space-y-6 max-w-4xl mx-auto"
        >
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.1] bg-clip-text text-transparent bg-gradient-to-b from-white via-slate-100 to-slate-400">
            Educación Inteligente, <br className="hidden sm:inline" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              Potenciada con IA
            </span>
          </h1>

          <p className="text-slate-400 text-base sm:text-xl max-w-2xl mx-auto leading-relaxed">
            Plataforma integral para docentes, estudiantes y administradores. Evaluación automatizada de trabajos de código, asistencia digital y analítica pedagógica en tiempo real.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex items-center justify-center pt-4"
        >
          <Button size="lg" className="h-12 px-10 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-base rounded-xl shadow-xl shadow-emerald-500/25 transition-all hover:scale-105" asChild>
            <Link href={targetAuthUrl}>
              {isLoggedIn ? "Ir al Dashboard" : "Iniciar Sesión"} <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
        </motion.div>

        {/* AI Integration Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="pt-10 flex flex-wrap items-center justify-center gap-4 border-t border-white/10 max-w-3xl mx-auto text-xs text-slate-400"
        >
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Bot className="w-4 h-4 text-emerald-400" /> Motores IA Integrados:
          </span>
          {aiModels.map((model, idx) => (
            <div key={idx} className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800">
              <span className="font-medium text-slate-200">{model.name}</span>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">{model.version}</span>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Feature Cards Grid (AI Canvas Bento Grid) */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-16 border-t border-white/10 space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
            Características Diseñadas para la Educación del Futuro
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
            Herramientas avanzadas integradas en una experiencia fluida e intuitiva.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feat, idx) => (
            <Link key={idx} href={targetAuthUrl} className="block group h-full">
              <AICanvasCard
                title={feat.title}
                description={feat.description}
                icon={feat.icon}
                badge={feat.badge}
                badgeColor={feat.badgeColor}
                accentColor={feat.accentColor}
                iconBgColor={feat.iconBgColor}
                iconTextColor={feat.iconTextColor}
                className="h-full bg-slate-900/80 border-slate-800 hover:border-slate-700"
              />
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-slate-950 py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-slate-400">SmartClass v3</span>
            <span>— Sistema de Gestión Académica</span>
          </div>
          <p>© 2026 SmartClass. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
