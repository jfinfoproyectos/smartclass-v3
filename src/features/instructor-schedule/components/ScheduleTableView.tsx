"use client";

import React, { useMemo } from "react";
import { 
  Institution, 
  ScheduleClassSlot, 
  ScheduleConflict 
} from "../types";
import { DAYS_CONFIG, INSTITUTION_COLORS } from "../constants/defaults";
import { toFormat12h, calculateSlotDurationHours } from "../utils/storage";
import { 
  Clock, 
  Users, 
  MapPin, 
  Edit3, 
  Trash2, 
  AlertTriangle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ScheduleTableViewProps {
  slots: ScheduleClassSlot[];
  institutions: Institution[];
  conflicts: ScheduleConflict[];
  selectedInstitutionId: string;
  onSelectSlot: (slot: ScheduleClassSlot) => void;
  onDeleteSlot: (slotId: string) => void;
}

export function ScheduleTableView({
  slots,
  institutions,
  conflicts,
  selectedInstitutionId,
  onSelectSlot,
  onDeleteSlot,
}: ScheduleTableViewProps) {
  const instMap = useMemo(() => new Map(institutions.map(i => [i.id, i])), [institutions]);
  const conflictingSlotIds = useMemo(() => {
    const ids = new Set<string>();
    conflicts.forEach(c => {
      ids.add(c.slotA.id);
      ids.add(c.slotB.id);
    });
    return ids;
  }, [conflicts]);

  const filteredSlots = useMemo(() => {
    let result = [...slots];
    if (selectedInstitutionId !== "ALL") {
      result = result.filter(s => s.institutionId === selectedInstitutionId);
    }

    // Ordenar por día de la semana y luego por hora de inicio
    const dayOrder: Record<string, number> = {
      MONDAY: 0,
      TUESDAY: 1,
      WEDNESDAY: 2,
      THURSDAY: 3,
      FRIDAY: 4,
      SATURDAY: 5,
      SUNDAY: 6,
    };

    return result.sort((a, b) => {
      const dayDiff = (dayOrder[a.dayOfWeek] ?? 0) - (dayOrder[b.dayOfWeek] ?? 0);
      if (dayDiff !== 0) return dayDiff;
      return a.startTime.localeCompare(b.startTime);
    });
  }, [slots, selectedInstitutionId]);

  if (filteredSlots.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border/80 p-12 text-center bg-card/40 flex flex-col items-center justify-center gap-2">
        <Clock className="w-8 h-8 text-muted-foreground/60" />
        <h4 className="font-bold text-sm text-foreground">No hay clases programadas</h4>
        <p className="text-xs text-muted-foreground">
          {selectedInstitutionId !== "ALL"
            ? "No hay sesiones asignadas para la institución seleccionada."
            : "Comienza programando tu primera clase semanal usando el botón superior."}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-3xl border border-border/80 bg-card/70 backdrop-blur-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-muted/50 border-b border-border/80 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="py-3 px-4">Día</th>
              <th className="py-3 px-4">Horario</th>
              <th className="py-3 px-4">Institución</th>
              <th className="py-3 px-4">Asignatura / Módulo</th>
              <th className="py-3 px-4">Ficha / Grupo</th>
              <th className="py-3 px-4">Modalidad & Sede</th>
              <th className="py-3 px-4 text-center">Horas</th>
              <th className="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filteredSlots.map(slot => {
              const inst = instMap.get(slot.institutionId);
              const colorScheme = INSTITUTION_COLORS[inst?.color || "emerald"] || INSTITUTION_COLORS.emerald;
              const dayConf = DAYS_CONFIG.find(d => d.key === slot.dayOfWeek);
              const hasConflict = conflictingSlotIds.has(slot.id);
              const duration = calculateSlotDurationHours(slot.startTime, slot.endTime);

              return (
                <tr 
                  key={slot.id} 
                  className={`hover:bg-muted/40 transition-colors ${
                    hasConflict ? "bg-red-500/5" : ""
                  }`}
                >
                  {/* Día */}
                  <td className="py-3 px-4 font-bold text-foreground">
                    <div className="flex items-center gap-1.5">
                      {hasConflict && (
                        <span title="Conflicto horario" className="inline-flex">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        </span>
                      )}
                      <span>{dayConf?.label || slot.dayOfWeek}</span>
                    </div>
                  </td>

                  {/* Horario */}
                  <td className="py-3 px-4 font-mono font-bold text-foreground">
                    <div className="flex items-center gap-1 text-[11px]">
                      <Clock className="w-3 h-3 text-primary" />
                      <span>{toFormat12h(slot.startTime)} - {toFormat12h(slot.endTime)}</span>
                    </div>
                  </td>

                  {/* Institución */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${colorScheme.dotColor}`} />
                      <Badge variant="outline" className={`text-[10px] font-bold ${colorScheme.badgeBg} ${colorScheme.badgeBorder} ${colorScheme.badgeText}`}>
                        {inst?.shortName || inst?.name || "INST"}
                      </Badge>
                    </div>
                  </td>

                  {/* Asignatura */}
                  <td className="py-3 px-4">
                    <div className="font-extrabold text-foreground">{slot.subject}</div>
                    {slot.notes && (
                      <div className="text-[10px] text-muted-foreground truncate max-w-xs mt-0.5 italic">
                        {slot.notes}
                      </div>
                    )}
                  </td>

                  {/* Grupo / Ficha */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1 font-semibold text-foreground">
                      <Users className="w-3 h-3 text-muted-foreground" />
                      <span>{slot.groupCode}</span>
                    </div>
                  </td>

                  {/* Modalidad y Sede */}
                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-0.5">
                      <Badge variant="secondary" className="w-fit text-[9px] font-extrabold">
                        {slot.modality}
                      </Badge>
                      {slot.classroom && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5 text-primary" />
                          {slot.classroom}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Horas */}
                  <td className="py-3 px-4 text-center font-mono font-bold">
                    <span className="px-2 py-0.5 rounded-md bg-muted text-[11px]">
                      {duration}h
                    </span>
                  </td>

                  {/* Acciones */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onSelectSlot(slot)}
                        className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onDeleteSlot(slot.id)}
                        className="h-7 w-7 rounded-lg text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
