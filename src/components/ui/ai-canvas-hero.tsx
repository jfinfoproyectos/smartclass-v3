"use client";

import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Calendar, ShieldCheck, GraduationCap, School, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface AICanvasHeroProps {
  userName?: string;
  userRole?: string;
  institutionName?: string;
  userImage?: string | null;
}

export function AICanvasHero({
  userName = "Usuario",
  userRole = "Estudiante",
  institutionName = "SmartClass",
  userImage,
}: AICanvasHeroProps) {
  const currentDateFormatted = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const getRoleLabel = (role: string) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return { label: "Administrador", icon: ShieldCheck, color: "bg-primary/10 text-primary border-primary/20" };
      case "teacher":
        return { label: "Docente", icon: GraduationCap, color: "bg-primary/10 text-primary border-primary/20" };
      default:
        return { label: "Estudiante", icon: User, color: "bg-primary/10 text-primary border-primary/20" };
    }
  };

  const roleInfo = getRoleLabel(userRole);
  const RoleIcon = roleInfo.icon;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card text-card-foreground p-5 sm:p-8 md:p-12 shadow-xl">
      {/* Background Animated Conic & Radial Gradients */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-primary/20 via-primary/10 to-transparent blur-3xl opacity-70 animate-pulse" />
      <div className="pointer-events-none absolute top-0 right-0 w-96 h-96 rounded-full bg-gradient-to-b from-primary/10 to-transparent blur-3xl" />
      
      {/* Grid Pattern overlay */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.07]" 
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '24px 24px'
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center space-y-4 sm:space-y-6 max-w-4xl mx-auto">
        {/* Top Pills: Date & Role */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-2 sm:gap-3"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-medium bg-muted/60 border border-border/60 backdrop-blur-md text-muted-foreground">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <span className="capitalize">{currentDateFormatted}</span>
          </div>

          <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold border backdrop-blur-md", roleInfo.color)}>
            <RoleIcon className="w-3.5 h-3.5" />
            <span>{roleInfo.label}</span>
          </div>
        </motion.div>

        {/* Main Title & Institution */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="space-y-2 sm:space-y-3"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[10px] sm:text-xs font-semibold tracking-wider uppercase">
            <School className="w-3.5 h-3.5" />
            <span>{institutionName}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-6xl font-extrabold tracking-tight text-foreground drop-shadow-sm">
            ¡Hola, {userName.split(" ")[0]}! 👋
          </h1>
          <p className="text-muted-foreground text-xs sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            Bienvenido al portal académico. Accede a tus herramientas principales, módulos de gestión y actividades actualizadas.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
