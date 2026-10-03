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
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  Palette, 
  MapPin, 
  AlertTriangle
} from "lucide-react";
import { Institution, ScheduleClassSlot } from "../types";
import { INSTITUTION_COLORS } from "../constants/defaults";
import { toast } from "sonner";

interface InstitutionsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  institutions: Institution[];
  slots: ScheduleClassSlot[];
  onSaveInstitutions: (institutions: Institution[], updatedSlots?: ScheduleClassSlot[]) => void;
}

export function InstitutionsManagerModal({
  isOpen,
  onClose,
  institutions,
  slots,
  onSaveInstitutions,
}: InstitutionsManagerModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [color, setColor] = useState("emerald");
  const [campus, setCampus] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
    assignedCount: number;
  } | null>(null);

  const resetForm = () => {
    setName("");
    setShortName("");
    setColor("emerald");
    setCampus("");
    setEditingId(null);
    setIsAddingNew(false);
  };

  const handleStartEdit = (inst: Institution) => {
    setEditingId(inst.id);
    setName(inst.name);
    setShortName(inst.shortName || "");
    setColor(inst.color || "emerald");
    setCampus(inst.campus || "");
    setIsAddingNew(false);
    setDeleteTarget(null);
  };

  const handleStartAdd = () => {
    resetForm();
    setIsAddingNew(true);
    setDeleteTarget(null);
  };

  const handleSaveItem = () => {
    if (!name.trim()) {
      toast.error("El nombre de la institución es obligatorio.");
      return;
    }

    if (isAddingNew) {
      const newInst: Institution = {
        id: `inst-${Date.now()}`,
        name: name.trim(),
        shortName: shortName.trim() || name.trim().slice(0, 8).toUpperCase(),
        color,
        campus: campus.trim(),
      };
      onSaveInstitutions([...institutions, newInst]);
      toast.success("Institución agregada exitosamente.");
    } else if (editingId) {
      const updated = institutions.map(i => {
        if (i.id === editingId) {
          return {
            ...i,
            name: name.trim(),
            shortName: shortName.trim() || name.trim().slice(0, 8).toUpperCase(),
            color,
            campus: campus.trim(),
          };
        }
        return i;
      });
      onSaveInstitutions(updated);
      toast.success("Institución actualizada.");
    }
    resetForm();
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    const updatedInstitutions = institutions.filter(i => i.id !== targetId);
    const updatedSlots = slots.filter(s => s.institutionId !== targetId);

    onSaveInstitutions(updatedInstitutions, updatedSlots);

    if (deleteTarget.assignedCount > 0) {
      toast.success(`Institución eliminada y ${deleteTarget.assignedCount} clase(s) removida(s).`);
    } else {
      toast.success("Institución eliminada exitosamente.");
    }

    if (editingId === targetId) resetForm();
    setDeleteTarget(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[620px] p-6 rounded-3xl max-h-[90vh] overflow-y-auto border-border/80 shadow-2xl">
        <DialogHeader className="space-y-1 pb-2 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Building2 className="w-4 h-4" />
            </div>
            <DialogTitle className="text-lg font-black tracking-tight text-foreground">
              Gestionar Instituciones Académicas
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Configura las entidades educativas donde dictas clase (SENA, Universidades, Institutos, Colegios).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Confirmación de eliminación */}
          {deleteTarget && (
            <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/30 space-y-2.5 animate-in fade-in-50 duration-150">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-destructive">
                    ¿Eliminar &quot;{deleteTarget.name}&quot;?
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    {deleteTarget.assignedCount > 0 ? (
                      <>
                        Esta institución tiene <strong className="text-foreground">{deleteTarget.assignedCount} clase(s)</strong> asignadas en el horario. Al eliminarla, <strong className="text-destructive font-bold">también se eliminarán esas clases</strong> de tu horario semanal.
                      </>
                    ) : (
                      "¿Estás seguro de que deseas eliminar esta institución de tu lista?"
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDeleteTarget(null)}
                  className="h-7 px-3 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleConfirmDelete}
                  className="h-7 px-3.5 rounded-xl text-xs font-black gap-1.5 shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Confirmar Eliminación</span>
                </Button>
              </div>
            </div>
          )}

          {/* List of institutions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">Instituciones Registradas ({institutions.length})</span>
              {!isAddingNew && !editingId && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleStartAdd}
                  className="h-8 rounded-xl text-xs font-bold gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar Institución</span>
                </Button>
              )}
            </div>

            {institutions.length === 0 && !isAddingNew ? (
              <div className="py-8 px-4 text-center border-2 border-dashed border-border/70 rounded-2xl flex flex-col items-center justify-center gap-2 bg-muted/20">
                <Building2 className="w-8 h-8 text-muted-foreground/60" />
                <span className="text-xs font-black text-foreground">No tienes instituciones registradas</span>
                <p className="text-[11px] text-muted-foreground max-w-xs">
                  Agrega las instituciones educativas o centros de formación donde dictas clase para organizar tus horarios.
                </p>
                <Button
                  size="sm"
                  onClick={handleStartAdd}
                  className="mt-1 h-8 rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Registrar Institución</span>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
                {institutions.map(inst => {
                  const scheme = INSTITUTION_COLORS[inst.color] || INSTITUTION_COLORS.emerald;
                  const assignedCount = slots.filter(s => s.institutionId === inst.id).length;
                  return (
                    <div
                      key={inst.id}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                        editingId === inst.id
                          ? "border-primary bg-primary/5 shadow-xs"
                          : "border-border/70 bg-card hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3.5 h-3.5 rounded-full ${scheme.dotColor} shrink-0 ring-2 ring-background`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-foreground">{inst.name}</span>
                            <Badge variant="outline" className={`text-[9px] font-bold ${scheme.badgeBg} ${scheme.badgeBorder} ${scheme.badgeText}`}>
                              {inst.shortName || "INST"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                            {inst.campus && <span>{inst.campus}</span>}
                            <span>• <strong className="text-foreground">{assignedCount}</strong> clases</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleStartEdit(inst)}
                          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setDeleteTarget({
                              id: inst.id,
                              name: inst.name,
                              assignedCount,
                            });
                          }}
                          title="Eliminar institución"
                          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Form to Add / Edit */}
          {(isAddingNew || editingId) && (
            <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-3 animate-in fade-in-50 duration-150">
              <div className="flex items-center justify-between pb-1 border-b border-border/50">
                <span className="text-xs font-extrabold text-foreground">
                  {isAddingNew ? "Nueva Institución" : "Editar Institución"}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={resetForm}
                  className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  Cancelar
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-[11px] font-bold">Nombre Completo</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: SENA - Complejo Central"
                    className="h-8.5 rounded-xl text-xs bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold">Sigla / Código</Label>
                  <Input
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value)}
                    placeholder="Ej: SENA"
                    className="h-8.5 rounded-xl text-xs bg-background"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold flex items-center gap-1">
                    <Palette className="w-3 h-3 text-primary" />
                    Color Identificador
                  </Label>
                  <Select value={color} onValueChange={setColor}>
                    <SelectTrigger className="h-8.5 rounded-xl text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl text-xs shadow-xl">
                      {Object.entries(INSTITUTION_COLORS).map(([key, item]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full ${item.dotColor}`} />
                            <span>{item.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-primary" />
                    Sede / Campus
                  </Label>
                  <Input
                    value={campus}
                    onChange={(e) => setCampus(e.target.value)}
                    placeholder="Ej: Sede Medellín"
                    className="h-8.5 rounded-xl text-xs bg-background"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  size="sm"
                  onClick={handleSaveItem}
                  className="h-8 px-4 rounded-xl text-xs font-bold gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isAddingNew ? "Agregar Institución" : "Guardar Cambios"}</span>
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-2 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-9 px-4 rounded-xl text-xs font-bold"
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
