"use client";

import React, { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Clock, 
  Building2, 
  BookOpen, 
  Users, 
  MapPin, 
  Trash2, 
  Copy, 
  Laptop
} from "lucide-react";
import { 
  DayOfWeekKey, 
  Institution, 
  ModalityType, 
  ScheduleClassSlot 
} from "../types";
import { DAYS_CONFIG, INSTITUTION_COLORS } from "../constants/defaults";
import { calculateSlotDurationHours, toFormat12h } from "../utils/storage";

interface ClassSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (slot: ScheduleClassSlot) => void;
  onDelete?: (slotId: string) => void;
  onDuplicate?: (slot: ScheduleClassSlot) => void;
  onOpenInstitutions?: () => void;
  initialSlot?: ScheduleClassSlot | null;
  defaultDay?: DayOfWeekKey;
  defaultStartTime?: string;
  institutions: Institution[];
}

interface ClassSlotFormBodyProps {
  initialSlot?: ScheduleClassSlot | null;
  defaultDay?: DayOfWeekKey;
  defaultStartTime?: string;
  institutions: Institution[];
  onSave: (slot: ScheduleClassSlot) => void;
  onClose: () => void;
  onDelete?: (slotId: string) => void;
  onDuplicate?: (slot: ScheduleClassSlot) => void;
  onOpenInstitutions?: () => void;
}

function ClassSlotFormBody({
  initialSlot,
  defaultDay,
  defaultStartTime,
  institutions,
  onSave,
  onClose,
  onDelete,
  onDuplicate,
  onOpenInstitutions,
}: ClassSlotFormBodyProps) {
  const [institutionId, setInstitutionId] = useState<string>(() => 
    initialSlot ? initialSlot.institutionId : (institutions[0]?.id || "")
  );
  const [subject, setSubject] = useState(() => initialSlot ? initialSlot.subject : "");
  const [groupCode, setGroupCode] = useState(() => initialSlot ? initialSlot.groupCode : "");
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeekKey>(() => 
    initialSlot ? initialSlot.dayOfWeek : (defaultDay || "MONDAY")
  );
  const [startTime, setStartTime] = useState(() => 
    initialSlot ? initialSlot.startTime : (defaultStartTime || "08:00")
  );
  const [endTime, setEndTime] = useState(() => {
    if (initialSlot) return initialSlot.endTime;
    const [h, m] = (defaultStartTime || "08:00").split(":").map(Number);
    const endH = Math.min(23, (h || 8) + 2);
    return `${String(endH).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
  });
  const [classroom, setClassroom] = useState(() => initialSlot?.classroom || "");
  const [modality, setModality] = useState<ModalityType>(() => initialSlot?.modality || "Presencial");
  const [notes, setNotes] = useState(() => initialSlot?.notes || "");

  if (institutions.length === 0) {
    return (
      <div className="py-6 px-2 text-center space-y-4">
        <div className="p-3 w-fit mx-auto rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <Building2 className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-black text-foreground">No tienes instituciones registradas</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Para programar una clase en el horario semanal, primero debes agregar al menos una institución educativa (SENA, Universidad, Instituto, etc.).
          </p>
        </div>
        <div className="pt-2 flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl text-xs font-bold">
            Cerrar
          </Button>
          {onOpenInstitutions && (
            <Button
              size="sm"
              onClick={() => {
                onClose();
                onOpenInstitutions();
              }}
              className="rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Registrar Institución</span>
            </Button>
          )}
        </div>
      </div>
    );
  }

  const durationHours = calculateSlotDurationHours(startTime, endTime);
  const selectedInstitution = institutions.find(i => i.id === institutionId) || institutions[0];
  const colorScheme = INSTITUTION_COLORS[selectedInstitution?.color || "emerald"] || INSTITUTION_COLORS.emerald;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) return;

    const newSlot: ScheduleClassSlot = {
      id: initialSlot ? initialSlot.id : `slot-${Date.now()}`,
      institutionId: institutionId || institutions[0]?.id || "",
      subject: subject.trim(),
      groupCode: groupCode.trim() || "General",
      dayOfWeek,
      startTime,
      endTime,
      classroom: classroom.trim(),
      modality,
      notes: notes.trim(),
    };

    onSave(newSlot);
    onClose();
  };

  const handleDuplicateClick = () => {
    if (!initialSlot || !onDuplicate) return;
    onDuplicate({
      ...initialSlot,
      id: `slot-${Date.now()}`,
    });
    onClose();
  };

  return (
    <>
      <DialogHeader className="space-y-1.5 pb-2 border-b border-border/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Calendar className="w-4 h-4" />
            </div>
            <DialogTitle className="text-lg font-black tracking-tight text-foreground">
              {initialSlot ? "Editar Sesión de Clase" : "Programar Nueva Clase"}
            </DialogTitle>
          </div>
          {selectedInstitution && (
            <Badge 
              variant="outline" 
              className={`text-xs font-bold ${colorScheme.badgeBg} ${colorScheme.badgeBorder} ${colorScheme.badgeText}`}
            >
              {selectedInstitution.shortName || selectedInstitution.name}
            </Badge>
          )}
        </div>
        <DialogDescription className="text-xs text-muted-foreground">
          Asigna franja horaria, institución educativa, materia y ambiente de formación.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {/* Institución */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-primary" />
            Institución Académica
          </Label>
          <Select value={institutionId} onValueChange={setInstitutionId}>
            <SelectTrigger className="h-9 rounded-xl text-xs bg-muted/30 border-border/80">
              <SelectValue placeholder="Seleccionar institución" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl text-xs shadow-xl">
              {institutions.map(inst => {
                const scheme = INSTITUTION_COLORS[inst.color] || INSTITUTION_COLORS.emerald;
                return (
                  <SelectItem key={inst.id} value={inst.id} className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${scheme.dotColor}`} />
                      <span className="font-bold">{inst.name}</span>
                      {inst.shortName && (
                        <span className="text-[10px] text-muted-foreground">({inst.shortName})</span>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Asignatura y Ficha */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-primary" />
              Asignatura / Módulo
            </Label>
            <Input
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ej: Programación Backend"
              className="h-9 rounded-xl text-xs bg-muted/30 border-border/80"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-primary" />
              Ficha / Grupo / Curso
            </Label>
            <Input
              value={groupCode}
              onChange={(e) => setGroupCode(e.target.value)}
              placeholder="Ej: Ficha 2670123 / Grupo A"
              className="h-9 rounded-xl text-xs bg-muted/30 border-border/80"
            />
          </div>
        </div>

        {/* Día y Franja Horaria */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              Día de la Semana
            </Label>
            <Select value={dayOfWeek} onValueChange={(val) => setDayOfWeek(val as DayOfWeekKey)}>
              <SelectTrigger className="h-9 rounded-xl text-xs bg-muted/30 border-border/80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl text-xs shadow-xl">
                {DAYS_CONFIG.map(d => (
                  <SelectItem key={d.key} value={d.key}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" />
              Hora Inicio
            </Label>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="h-9 rounded-xl text-xs bg-muted/30 border-border/80"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" />
              Hora Fin
            </Label>
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="h-9 rounded-xl text-xs bg-muted/30 border-border/80"
            />
          </div>
        </div>

        {/* Badge de resumen de duración */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/70 text-xs">
          <span className="text-muted-foreground font-medium">Franja estimada:</span>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-foreground">
              {toFormat12h(startTime)} — {toFormat12h(endTime)}
            </span>
            <Badge variant="secondary" className="text-[10px] font-extrabold bg-primary/10 text-primary border border-primary/20">
              {durationHours} horas
            </Badge>
          </div>
        </div>

        {/* Modalidad y Ambiente */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Laptop className="w-3.5 h-3.5 text-primary" />
              Modalidad
            </Label>
            <Select value={modality} onValueChange={(val) => setModality(val as ModalityType)}>
              <SelectTrigger className="h-9 rounded-xl text-xs bg-muted/30 border-border/80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl text-xs shadow-xl">
                <SelectItem value="Presencial">Presencial</SelectItem>
                <SelectItem value="Virtual">Virtual / Remota</SelectItem>
                <SelectItem value="Híbrida">Híbrida</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              Ambiente / Salón / Enlace
            </Label>
            <Input
              value={classroom}
              onChange={(e) => setClassroom(e.target.value)}
              placeholder="Ej: Ambiente 304 / Teams"
              className="h-9 rounded-xl text-xs bg-muted/30 border-border/80"
            />
          </div>
        </div>

        {/* Notas u observaciones */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-foreground">
            Observaciones pedagógicas o temas (opcional)
          </Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej: Llevar material para taller de APIs, entrega de informe quincenal..."
            rows={2}
            className="rounded-xl text-xs bg-muted/30 border-border/80 resize-none"
          />
        </div>

        <DialogFooter className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-border/60">
          <div className="flex items-center gap-1.5">
            {initialSlot && onDelete && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  onDelete(initialSlot.id);
                  onClose();
                }}
                className="h-9 rounded-xl text-xs font-bold gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar</span>
              </Button>
            )}

            {initialSlot && onDuplicate && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDuplicateClick}
                className="h-9 rounded-xl text-xs font-bold gap-1.5 border-border/80"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Duplicar</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-9 rounded-xl text-xs font-bold"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-9 px-4 rounded-xl text-xs font-extrabold bg-primary text-primary-foreground shadow-sm hover:brightness-105"
            >
              {initialSlot ? "Guardar Cambios" : "Agregar Sesión"}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </>
  );
}

export function ClassSlotModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  onDuplicate,
  onOpenInstitutions,
  initialSlot,
  defaultDay,
  defaultStartTime,
  institutions,
}: ClassSlotModalProps) {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[560px] p-6 rounded-3xl max-h-[90vh] overflow-y-auto border-border/80 shadow-2xl">
        <ClassSlotFormBody
          key={initialSlot ? initialSlot.id : `new-${defaultDay || "MONDAY"}-${defaultStartTime || "08:00"}`}
          initialSlot={initialSlot}
          defaultDay={defaultDay}
          defaultStartTime={defaultStartTime}
          institutions={institutions}
          onSave={onSave}
          onClose={onClose}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onOpenInstitutions={onOpenInstitutions}
        />
      </DialogContent>
    </Dialog>
  );
}
