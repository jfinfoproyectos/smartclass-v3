"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Activity, 
  TrendingUp, 
  BrainCircuit, 
  Clock, 
  Award,
  ChevronRight,
  RefreshCw,
  Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getAICanvasRealActivitiesAction, RealActivityItem } from "@/features/home/actions/aiCanvasActions";

const DEFAULT_REAL_ACTIVITIES: RealActivityItem[] = [
  {
    id: "act-1",
    title: "Módulo de IA Configurado",
    category: "ai",
    timestamp: "Sistema",
    detail: "AI Canvas Co-Pilot activo para generación pedagógica y análisis en tiempo real.",
    status: "completed"
  },
  {
    id: "act-2",
    title: "Gestión Académica de Cursos",
    category: "achievement",
    timestamp: "Activo",
    detail: "Módulos de asistencia, evaluaciones y publicaciones sincronizados.",
    status: "completed"
  }
];

export function AICanvasActivityMatrix({ className }: { className?: string }) {
  const [filter, setFilter] = useState<string>("all");
  const [activities, setActivities] = useState<RealActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRealData() {
      setLoading(true);
      try {
        const realData = await getAICanvasRealActivitiesAction();
        if (realData && realData.length > 0) {
          setActivities(realData);
        } else {
          setActivities(DEFAULT_REAL_ACTIVITIES);
        }
      } catch (err) {
        setActivities(DEFAULT_REAL_ACTIVITIES);
      } finally {
        setLoading(false);
      }
    }
    loadRealData();
  }, []);

  const filteredItems = activities.filter(item => {
    if (filter === "all") return true;
    return item.category === filter;
  });

  const getCategoryIcon = (category: RealActivityItem["category"]) => {
    switch (category) {
      case "ai":
        return <BrainCircuit className="w-4 h-4 text-primary" />;
      case "evaluation":
        return <TrendingUp className="w-4 h-4 text-primary" />;
      case "attendance":
        return <Clock className="w-4 h-4 text-primary" />;
      case "achievement":
        return <Award className="w-4 h-4 text-primary" />;
    }
  };

  const getStatusBadge = (status: RealActivityItem["status"]) => {
    switch (status) {
      case "completed":
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px]">Completado</Badge>;
      case "in_progress":
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px]">En Proceso</Badge>;
      case "alert":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px]">Revisar</Badge>;
    }
  };

  return (
    <div className={cn("relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card p-6 sm:p-8 shadow-sm space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              AI Canvas Timeline
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            </h3>
            <p className="text-xs text-muted-foreground">
              Historial y actividad real sincronizada de la plataforma.
            </p>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted rounded-xl text-xs font-semibold">
          {[
            { id: "all", label: "Todos" },
            { id: "ai", label: "IA Insights" },
            { id: "evaluation", label: "Evaluaciones" },
            { id: "achievement", label: "Logros" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all",
                filter === tab.id
                  ? "bg-background text-foreground shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Activity List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground text-xs gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-primary" />
            <span>Cargando actividad del sistema...</span>
          </div>
        ) : filteredItems.length > 0 ? (
          filteredItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-border/80 bg-muted/30 hover:bg-muted/60 transition-colors"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-card border border-border shrink-0 mt-0.5 shadow-sm">
                  {getCategoryIcon(item.category)}
                </div>
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                      {item.title}
                    </h4>
                    {getStatusBadge(item.status)}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {item.detail}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 self-end sm:self-auto text-xs text-muted-foreground">
                {item.score && (
                  <span className="font-mono font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    {item.score}
                  </span>
                )}
                <span className="text-[11px] font-medium">{item.timestamp}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground text-xs">
            No se encontraron actividades registradas para esta categoría.
          </div>
        )}
      </div>
    </div>
  );
}
