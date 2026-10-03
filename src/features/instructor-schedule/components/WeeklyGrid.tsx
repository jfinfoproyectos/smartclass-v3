"use client";

import React, { useMemo } from "react";
import { 
  DayOfWeekKey, 
  Institution, 
  ScheduleClassSlot, 
  ScheduleConflict 
} from "../types";
import { DAYS_CONFIG, INSTITUTION_COLORS } from "../constants/defaults";
import { 
  timeToMinutes, 
  toFormat12h, 
  calculateSlotDurationHours 
} from "../utils/storage";
import { 
  Clock, 
  Users, 
  MapPin, 
  Cloud, 
  Sun, 
  Moon, 
  AlertTriangle, 
  Plus
} from "lucide-react";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface WeeklyGridProps {
  slots: ScheduleClassSlot[];
  institutions: Institution[];
  conflicts: ScheduleConflict[];
  selectedInstitutionId: string; // "ALL" or specific id
  onSelectSlot: (slot: ScheduleClassSlot) => void;
  onAddSlotOnDay: (day: DayOfWeekKey, hour: string) => void;
}

const HOUR_HEIGHT = 52; // Altura en px por hora

// Ícono de jornada (Mañana, Tarde, Noche) estilo AcademixV2
const renderTimeOfDayIcon = (startTime: string, endTime: string) => {
  const [sh] = startTime.split(":").map(Number);
  const [eh] = endTime.split(":").map(Number);
  const midHour = (sh + (eh || sh + 2)) / 2;

  if (midHour < 12) {
    return (
      <span title="Jornada Mañana" className="inline-flex items-center text-amber-500">
        <Sun className="w-3.5 h-3.5 shrink-0" />
      </span>
    );
  } else if (midHour < 18) {
    return (
      <span title="Jornada Tarde" className="inline-flex items-center text-orange-500">
        <Cloud className="w-3.5 h-3.5 shrink-0" />
      </span>
    );
  } else {
    return (
      <span title="Jornada Noche" className="inline-flex items-center text-indigo-400">
        <Moon className="w-3.5 h-3.5 shrink-0" />
      </span>
    );
  }
};

export function WeeklyGrid({
  slots,
  institutions,
  conflicts,
  selectedInstitutionId,
  onSelectSlot,
  onAddSlotOnDay,
}: WeeklyGridProps) {
  const instMap = useMemo(() => new Map(institutions.map(i => [i.id, i])), [institutions]);

  // Filtrar según institución seleccionada
  const filteredSlots = useMemo(() => {
    if (selectedInstitutionId === "ALL") return slots;
    return slots.filter(s => s.institutionId === selectedInstitutionId);
  }, [slots, selectedInstitutionId]);

  // Identificar IDs de slots con conflicto
  const conflictingSlotIds = useMemo(() => {
    const ids = new Set<string>();
    conflicts.forEach(c => {
      ids.add(c.slotA.id);
      ids.add(c.slotB.id);
    });
    return ids;
  }, [conflicts]);

  // Calcular franjas mínimas y máximas dinámicas (por defecto 06:00 a 22:00)
  const { minHour, totalHours } = useMemo(() => {
    let minH = 6;
    let maxH = 22;

    filteredSlots.forEach(s => {
      const [sh] = s.startTime.split(":").map(Number);
      const [eh, em] = s.endTime.split(":").map(Number);
      if (sh < minH) minH = sh;
      const endCeil = em > 0 ? eh + 1 : eh;
      if (endCeil > maxH) maxH = endCeil;
    });

    minH = Math.max(0, Math.min(minH, 6));
    maxH = Math.min(24, Math.max(maxH, 22));

    return {
      minHour: minH,
      maxHour: maxH,
      totalHours: maxH - minH,
    };
  }, [filteredSlots]);

  // Determinar el día de hoy para highlight (0 = Domingo en JS, adaptamos a MONDAY=0)
  const currentDayIndex = useMemo(() => {
    const d = new Date().getDay();
    // domingo = 6, lunes = 0, etc.
    return (d + 6) % 7;
  }, []);

  const hoursArray = useMemo(() => {
    return Array.from({ length: totalHours }, (_, i) => minHour + i);
  }, [totalHours, minHour]);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="w-full rounded-3xl border border-border/80 bg-card/70 backdrop-blur-xl shadow-sm overflow-hidden flex flex-col">
        {/* Scroll horizontal contenedor para dispositivos móviles y pantallas estrechas */}
        <div 
          className="w-full overflow-x-auto select-none scrollbar-thin pb-2" 
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div className="min-w-[840px] flex flex-col">
            {/* Header de los días */}
            <div className="grid grid-cols-[64px_repeat(7,1fr)] divide-x divide-border/60 border-b border-border/80 bg-muted/50 sticky top-0 z-30 backdrop-blur-md">
              {/* Columna de hora vacía */}
              <div className="py-2.5 px-1 text-center text-[10px] font-bold text-muted-foreground uppercase sticky left-0 bg-muted/90 z-40 border-r border-border/70">
                Hora
              </div>

              {DAYS_CONFIG.map((day, idx) => {
                const daySlots = filteredSlots.filter(s => s.dayOfWeek === day.key);
                const isToday = idx === currentDayIndex;

                return (
                  <div
                    key={day.key}
                    className={`py-2 px-2 text-center flex flex-col items-center justify-center transition-colors ${
                      isToday ? "bg-primary/10" : ""
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[11px] font-extrabold uppercase tracking-wide ${
                        isToday ? "text-primary" : "text-foreground"
                      }`}>
                        {day.label}
                      </span>
                      {daySlots.length > 0 && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-primary/15 text-primary font-black">
                          {daySlots.length}
                        </span>
                      )}
                    </div>
                    {isToday && (
                      <span className="text-[9px] font-extrabold text-primary bg-primary/20 px-2 py-0.5 rounded-full mt-0.5">
                        Hoy
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Matriz del Calendario Semanal */}
            <div className="relative grid grid-cols-[64px_repeat(7,1fr)] divide-x divide-border/60">
              {/* Columna de Horas lateral */}
              <div className="flex flex-col sticky left-0 z-20 bg-background/95 border-r border-border/70 backdrop-blur-md divide-y divide-border/40">
                {hoursArray.map((hour) => {
                  const ap = hour >= 12 ? "p.m." : "a.m.";
                  const h12 = hour % 12 === 0 ? 12 : hour % 12;
                  return (
                    <div
                      key={hour}
                      className="h-[52px] text-right pr-2 pt-1 text-[10px] font-bold text-muted-foreground font-mono select-none"
                    >
                      {h12} {ap}
                    </div>
                  );
                })}
              </div>

              {/* 7 Columnas para los Días (Lunes a Domingo) */}
              {DAYS_CONFIG.map((day, dayIdx) => {
                const daySlots = filteredSlots.filter(s => s.dayOfWeek === day.key);
                const isToday = dayIdx === currentDayIndex;

                return (
                  <div
                    key={day.key}
                    className={`relative flex flex-col divide-y divide-border/30 min-h-[${totalHours * HOUR_HEIGHT}px] ${
                      isToday ? "bg-primary/[0.03]" : ""
                    }`}
                    style={{ height: `${totalHours * HOUR_HEIGHT}px` }}
                  >
                    {/* Guías horarias de fondo (Permiten hacer clic para agregar una clase en esa franja) */}
                    {hoursArray.map((hour) => (
                      <div
                        key={hour}
                        onClick={() => onAddSlotOnDay(day.key, `${String(hour).padStart(2, "0")}:00`)}
                        className="group/hour h-[52px] relative transition-colors hover:bg-primary/5 cursor-pointer"
                        title={`Haz clic para programar clase el ${day.label} a las ${hour}:00`}
                      >
                        <div className="hidden group-hover/hour:flex absolute inset-0 items-center justify-center pointer-events-none">
                          <span className="text-[10px] font-bold text-primary/70 flex items-center gap-1 bg-background/80 px-2 py-0.5 rounded-md border border-primary/20 shadow-2xs">
                            <Plus className="w-3 h-3" /> Añadir ({hour}:00)
                          </span>
                        </div>
                      </div>
                    ))}

                    {/* Tarjetas de Clases Absolutas sobre el Canvas */}
                    {daySlots.map((slot) => {
                      const startMins = timeToMinutes(slot.startTime);
                      const endMins = timeToMinutes(slot.endTime);
                      const baseMins = minHour * 60;

                      const topPx = ((startMins - baseMins) / 60) * HOUR_HEIGHT;
                      const heightPx = Math.max(34, ((endMins - startMins) / 60) * HOUR_HEIGHT);

                      const inst = instMap.get(slot.institutionId);
                      const colorScheme = INSTITUTION_COLORS[inst?.color || "emerald"] || INSTITUTION_COLORS.emerald;
                      const hasConflict = conflictingSlotIds.has(slot.id);
                      const duration = calculateSlotDurationHours(slot.startTime, slot.endTime);

                      return (
                        <Tooltip key={slot.id}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => onSelectSlot(slot)}
                              className={`absolute left-1 right-1 rounded-xl border p-2 text-left text-xs font-medium overflow-hidden transition-all shadow-2xs hover:shadow-md z-10 flex flex-col justify-between group/card cursor-pointer ${
                                colorScheme.cardBg
                              } ${colorScheme.cardBorder} ${colorScheme.cardText} ${colorScheme.cardHover} ${
                                hasConflict ? "ring-2 ring-red-500 animate-pulse border-red-500" : ""
                              }`}
                              style={{
                                top: `${topPx}px`,
                                height: `${heightPx - 3}px`,
                              }}
                            >
                              {/* Header Card */}
                              <div className="space-y-0.5 overflow-hidden w-full">
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1 truncate">
                                    <div className={`w-2 h-2 rounded-full ${colorScheme.dotColor} shrink-0`} />
                                    <span className="text-[9px] font-black uppercase tracking-wider opacity-85 truncate">
                                      {inst?.shortName || inst?.name || "INST"}
                                    </span>
                                  </div>
                                  <div className="shrink-0 flex items-center gap-1">
                                    {hasConflict && (
                                      <span title="¡Conflicto horario detectado!">
                                        <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                                      </span>
                                    )}
                                    {renderTimeOfDayIcon(slot.startTime, slot.endTime)}
                                  </div>
                                </div>

                                <div className="font-extrabold text-[11px] truncate leading-snug">
                                  {slot.subject}
                                </div>

                                <div className="text-[9.5px] opacity-90 truncate flex items-center gap-1.5 font-medium mt-0.5">
                                  {slot.groupCode && (
                                    <span className="flex items-center gap-1 truncate">
                                      <Users className="w-2.5 h-2.5 shrink-0 opacity-70" />
                                      <strong className="font-bold">{slot.groupCode}</strong>
                                    </span>
                                  )}
                                  {slot.classroom && (
                                    <span className="flex items-center gap-1 truncate opacity-80">
                                      • <MapPin className="w-2.5 h-2.5 shrink-0 opacity-70" />
                                      {slot.classroom}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Footer Card: Horario */}
                              <div className="text-[9.5px] font-mono font-bold opacity-90 flex items-center justify-between pt-0.5 border-t border-black/10 dark:border-white/10 mt-1">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  <span>{toFormat12h(slot.startTime)} - {toFormat12h(slot.endTime)}</span>
                                </div>
                                <span className="text-[8.5px] font-sans font-extrabold px-1 rounded bg-black/10 dark:bg-white/10">
                                  {duration}h
                                </span>
                              </div>
                            </button>
                          </TooltipTrigger>

                          <TooltipContent 
                            side="top" 
                            align="center" 
                            className="rounded-2xl p-3 max-w-xs space-y-1.5 shadow-xl border-border/80 bg-popover text-popover-foreground"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <Badge variant="outline" className={`text-[9px] font-bold ${colorScheme.badgeBg} ${colorScheme.badgeBorder} ${colorScheme.badgeText}`}>
                                {inst?.name || "Institución"}
                              </Badge>
                              <Badge variant="secondary" className="text-[9px] font-extrabold">
                                {slot.modality}
                              </Badge>
                            </div>
                            <p className="font-extrabold text-xs text-foreground leading-tight">{slot.subject}</p>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3 text-primary" />
                              {toFormat12h(slot.startTime)} a {toFormat12h(slot.endTime)} ({duration} horas)
                            </p>
                            {slot.groupCode && (
                              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Users className="w-3 h-3 text-primary" />
                                Grupo: <strong className="text-foreground">{slot.groupCode}</strong>
                              </p>
                            )}
                            {slot.classroom && (
                              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-primary" />
                                Sede / Ambiente: {slot.classroom}
                              </p>
                            )}
                            {slot.notes && (
                              <p className="text-[10px] text-muted-foreground italic bg-muted/40 p-1.5 rounded-lg border border-border/50">
                                {slot.notes}
                              </p>
                            )}
                            {hasConflict && (
                              <p className="text-[10px] text-red-500 font-bold flex items-center gap-1 bg-red-500/10 p-1.5 rounded border border-red-500/20">
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                ¡Existe cruce de horario con otra clase este día!
                              </p>
                            )}
                            <p className="text-[9.5px] text-primary font-bold pt-1 text-center">
                              Haz clic para editar o reasignar
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
