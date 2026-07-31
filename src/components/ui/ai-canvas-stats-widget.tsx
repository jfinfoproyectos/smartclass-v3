"use client";

import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Bell, ArrowRight, ShieldAlert, CheckCircle2, Info, BookMarked, HelpCircle, FileText } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

interface AnnouncementItem {
  id: string;
  title: string;
  description: string;
  tag: string;
  tagColor: string;
  date: string;
}

const defaultAnnouncements: AnnouncementItem[] = [
  {
    id: "1",
    title: "Plataforma Actualizada a la Versión 3.0",
    description: "Nuevas herramientas de evaluación, diseño interactivo y rendimiento optimizado.",
    tag: "Novedad",
    tagColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    date: "Hoy",
  },
  {
    id: "2",
    title: "Módulo de Asistencia y Calificaciones",
    description: "Recuerda revisar tus registros de asistencia diaria y reportes periódicos.",
    tag: "Recordatorio",
    tagColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    date: "Esta semana",
  },
];

interface AICanvasStatsWidgetProps {
  role?: string;
}

export function AICanvasStatsWidget({ role = "student" }: AICanvasStatsWidgetProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Announcements Card */}
      <Card className="lg:col-span-2 overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-card shadow-sm hover:shadow-md transition-shadow">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">Novedades & Anuncios</h3>
                <p className="text-xs text-muted-foreground">Avisos importantes del sistema institucional</p>
              </div>
            </div>

            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              Activo
            </span>
          </div>

          <div className="space-y-3">
            {defaultAnnouncements.map((item) => (
              <div
                key={item.id}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${item.tagColor}`}>
                      {item.tag}
                    </span>
                    <span className="text-xs text-muted-foreground">{item.date}</span>
                  </div>
                  <h4 className="font-semibold text-sm text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Quick Help & Docs Banner */}
      <Card className="overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 text-white shadow-sm flex flex-col justify-between p-6">
        <div className="space-y-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <BookMarked className="w-5 h-5" />
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-lg text-white">Centro de Ayuda y Guías</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              ¿Tienes dudas sobre el uso de la plataforma? Explora la documentación oficial y tutoriales paso a paso.
            </p>
          </div>
        </div>

        <div className="pt-6 border-t border-white/10 mt-6 flex items-center justify-between">
          <span className="text-xs text-slate-400">SmartClass v3 Docs</span>
          <Link
            href="/docs"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors shadow-sm"
          >
            <span>Ver Docs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </Card>
    </div>
  );
}
