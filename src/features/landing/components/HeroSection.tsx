"use client";

import React from "react";
import { motion } from "framer-motion";
import { BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LampContainer } from "@/components/ui/lamp";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <LampContainer>
        <motion.div
          initial={{ opacity: 0.5, y: 100 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          className="flex flex-col items-center text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium bg-primary/10 text-primary border-primary/20 mb-8">
            <BrainCircuit className="size-4" />
            Potenciado con IA
          </div>
          
          <h1 className="text-white text-5xl font-bold tracking-tight md:text-8xl mb-6">
            SmartClass
            <span className="block bg-gradient-to-r from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent mt-2 pb-2">
              Educación Inteligente
            </span>
          </h1>

          <p className="text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed mb-10">
            Plataforma integral para la gestión académica moderna. Calificación automática de código con IA, integración con GitHub, control de asistencia y reportes detallados.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-white border-none px-8" asChild>
              <Link href="/signin">Entrar al panel</Link>
            </Button>
            <Button variant="outline" size="lg" className="border-slate-700 text-slate-300 hover:bg-slate-900 px-8" asChild>
              <Link href="/signup">Crear cuenta</Link>
            </Button>
          </div>

          <div className="text-slate-500 mt-10 text-sm flex items-center gap-6">
            <span className="flex items-center gap-2"><BrainCircuit className="size-4" /> Gemini AI</span>
          </div>
        </motion.div>
      </LampContainer>
    </section>
  );
}
