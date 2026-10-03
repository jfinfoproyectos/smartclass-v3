"use client";

import React, { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { 
  User, 
  Calendar, 
  FileText, 
  Check, 
  RotateCcw,
  Sparkles
} from "lucide-react";
import { InstructorScheduleProfile } from "../types";
import { toast } from "sonner";

interface ScheduleHeaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: InstructorScheduleProfile;
  activeInstructorName?: string;
  onSaveHeader: (data: {
    instructorName: string;
    periodTitle: string;
    academicYear: string;
    notes: string;
  }) => void;
}

export function ScheduleHeaderModal({
  isOpen,
  onClose,
  profile,
  activeInstructorName,
  onSaveHeader,
}: ScheduleHeaderModalProps) {
  const [instructorName, setInstructorName] = useState(profile.instructorName || "");
  const [periodTitle, setPeriodTitle] = useState(profile.periodTitle || "Primer Periodo Académico");
  const [academicYear, setAcademicYear] = useState(profile.academicYear || String(new Date().getFullYear()));
  const [notes, setNotes] = useState(profile.notes || "");

  // Sincronizar estado cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setInstructorName(profile.instructorName || activeInstructorName || "Instructor Docente");
      setPeriodTitle(profile.periodTitle || "Primer Periodo Académico");
      setAcademicYear(profile.academicYear || String(new Date().getFullYear()));
      setNotes(profile.notes || "");
    }
  }, [isOpen, profile, activeInstructorName]);

  const handleUseActiveName = () => {
    if (activeInstructorName) {
      setInstructorName(activeInstructorName);
      toast.info(`Nombre asignado al instructor activo: ${activeInstructorName}`);
    }
  };

  const handleApplyPresetPeriod = (preset: string) => {
    setPeriodTitle(preset);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!instructorName.trim()) {
      toast.error("El nombre del docente o instructor no puede estar vacío.");
      return;
    }

    onSaveHeader({
      instructorName: instructorName.trim(),
      periodTitle: periodTitle.trim() || "Periodo Académico",
      academicYear: academicYear.trim() || String(new Date().getFullYear()),
      notes: notes.trim(),
    });

    toast.success("Información del horario actualizada exitosamente.");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[560px] p-6 rounded-3xl max-h-[90vh] overflow-y-auto border-border/80 shadow-2xl">
        <DialogHeader className="space-y-1 pb-2 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <User className="w-4 h-4" />
            </div>
            <DialogTitle className="text-lg font-black tracking-tight text-foreground">
              Personalizar Información del Horario
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Configura el nombre del docente, el período académico y las observaciones generales que se mostrarán en la plataforma y en el PDF oficial.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Nombre del Instructor */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-primary" />
                Nombre del Docente / Instructor
              </Label>
              {activeInstructorName && instructorName !== activeInstructorName && (
                <button
                  type="button"
                  onClick={handleUseActiveName}
                  className="text-[10.5px] font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Cargar nombre activo</span>
                </button>
              )}
            </div>
            <Input
              required
              value={instructorName}
              onChange={(e) => setInstructorName(e.target.value)}
              placeholder="Ej: Jhon Fredy Valencia"
              className="h-9 rounded-xl text-xs bg-muted/30 border-border/80"
            />
            <p className="text-[10px] text-muted-foreground">
              Este nombre aparecerá en la cabecera del horario, en los reportes y en el bloque de firmas institucionales.
            </p>
          </div>

          {/* Periodo y Año Académico */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Período Académico
              </Label>
              <Input
                required
                value={periodTitle}
                onChange={(e) => setPeriodTitle(e.target.value)}
                placeholder="Ej: Primer Periodo Académico / Trimestre I"
                className="h-9 rounded-xl text-xs bg-muted/30 border-border/80"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Año
              </Label>
              <Input
                required
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="2026"
                className="h-9 rounded-xl text-xs bg-muted/30 border-border/80"
              />
            </div>
          </div>

          {/* Atajos de Periodo */}
          <div className="space-y-1">
            <span className="text-[10.5px] font-bold text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Sugerencias rápidas de período:
            </span>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {[
                "Primer Periodo Académico",
                "Segundo Periodo Académico",
                "Primer Semestre",
                "Segundo Semestre",
                "Trimestre I",
                "Trimestre II",
                "Trimestre III",
                "Trimestre IV",
              ].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleApplyPresetPeriod(p)}
                  className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all ${
                    periodTitle === p
                      ? "bg-primary/10 border-primary text-primary font-bold"
                      : "bg-muted/40 border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/80"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Notas u Observaciones Generales */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-primary" />
              Observaciones / Subtítulo del Horario (Opcional)
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Horario consolidado semanal multi-institucional para el año 2026."
              rows={2}
              className="rounded-xl text-xs bg-muted/30 border-border/80 resize-none"
            />
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-9 px-4 rounded-xl text-xs font-bold"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-9 px-4 rounded-xl text-xs font-extrabold gap-1.5 bg-primary text-primary-foreground shadow-sm hover:brightness-105"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Guardar Datos</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
