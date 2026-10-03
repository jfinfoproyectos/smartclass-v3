"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Building2, 
  Plus, 
  FileJson, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Grid, 
  List, 
  Search, 
  X,
  Layers,
  User,
  Edit3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { DashboardContainer } from "@/components/ui/dashboard-container";
import { 
  DayOfWeekKey, 
  Institution, 
  InstructorScheduleProfile, 
  ScheduleClassSlot 
} from "../types";
import { 
  DEFAULT_PROFILE, 
  INSTITUTION_COLORS 
} from "../constants/defaults";
import { 
  loadScheduleProfile, 
  saveScheduleProfile, 
  computeScheduleStats, 
  detectScheduleConflicts 
} from "../utils/storage";
import { WeeklyGrid } from "./WeeklyGrid";
import { ScheduleTableView } from "./ScheduleTableView";
import { ClassSlotModal } from "./ClassSlotModal";
import { InstitutionsManagerModal } from "./InstitutionsManagerModal";
import { ImportExportModal } from "./ImportExportModal";
import { PDFPreviewModal } from "./PDFPreviewModal";
import { ScheduleHeaderModal } from "./ScheduleHeaderModal";
import { toast } from "sonner";

interface InstructorSchedulePlannerViewProps {
  instructorId?: string;
  initialInstructorName?: string;
}

export function InstructorSchedulePlannerView({
  instructorId,
  initialInstructorName,
}: InstructorSchedulePlannerViewProps) {
  const [isMounted, setIsMounted] = useState(false);

  // Estado del Perfil (inicialización idéntica en SSR y primer render del cliente)
  const [profile, setProfile] = useState<InstructorScheduleProfile>(() => ({
    ...DEFAULT_PROFILE,
    instructorName: initialInstructorName || DEFAULT_PROFILE.instructorName,
    slots: [],
  }));

  // Filtros y Vista
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  // Modales
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState<ScheduleClassSlot | null>(null);
  const [defaultSlotDay, setDefaultSlotDay] = useState<DayOfWeekKey>("MONDAY");
  const [defaultSlotHour, setDefaultSlotHour] = useState<string>("08:00");

  const [isHeaderModalOpen, setIsHeaderModalOpen] = useState(false);
  const [isInstitutionsModalOpen, setIsInstitutionsModalOpen] = useState(false);
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Cargar datos desde localStorage únicamente tras montar en el cliente (independiente para cada instructor)
  useEffect(() => {
    setIsMounted(true);
    const loaded = loadScheduleProfile(instructorId, initialInstructorName);
    setProfile(loaded);
  }, [instructorId, initialInstructorName]);

  // Sincronizar cambios en localStorage una vez montado de forma independiente
  useEffect(() => {
    if (!isMounted) return;
    saveScheduleProfile(profile, instructorId);
  }, [profile, isMounted, instructorId]);

  // Cálculos reactivos de estadísticas y conflictos
  const stats = useMemo(() => {
    return computeScheduleStats(profile.slots, profile.institutions);
  }, [profile.slots, profile.institutions]);

  const conflicts = useMemo(() => {
    return detectScheduleConflicts(profile.slots, profile.institutions);
  }, [profile.slots, profile.institutions]);

  // Slots filtrados por búsqueda
  const visibleSlots = useMemo(() => {
    if (!searchQuery.trim()) return profile.slots;
    const q = searchQuery.toLowerCase();
    return profile.slots.filter(s => 
      s.subject.toLowerCase().includes(q) ||
      s.groupCode.toLowerCase().includes(q) ||
      (s.classroom && s.classroom.toLowerCase().includes(q))
    );
  }, [profile.slots, searchQuery]);

  // Manejo de Clases
  const handleSaveSlot = (slot: ScheduleClassSlot) => {
    setProfile(prev => {
      const exists = prev.slots.some(s => s.id === slot.id);
      let updatedSlots: ScheduleClassSlot[];
      if (exists) {
        updatedSlots = prev.slots.map(s => s.id === slot.id ? slot : s);
        toast.success("Sesión de clase actualizada.");
      } else {
        updatedSlots = [...prev.slots, slot];
        toast.success("Nueva clase programada en el horario.");
      }
      return {
        ...prev,
        slots: updatedSlots,
      };
    });
  };

  const handleDeleteSlot = (slotId: string) => {
    setProfile(prev => ({
      ...prev,
      slots: prev.slots.filter(s => s.id !== slotId),
    }));
    toast.success("Clase eliminada del horario.");
  };

  const handleDuplicateSlot = (slot: ScheduleClassSlot) => {
    setProfile(prev => ({
      ...prev,
      slots: [...prev.slots, slot],
    }));
    toast.success("Clase duplicada correctamente.");
  };

  const handleOpenAddSlot = (day: DayOfWeekKey = "MONDAY", hour: string = "08:00") => {
    if (profile.institutions.length === 0) {
      toast.info("Por favor registra al menos una institución antes de programar una clase.");
      setIsInstitutionsModalOpen(true);
      return;
    }
    setActiveSlot(null);
    setDefaultSlotDay(day);
    setDefaultSlotHour(hour);
    setIsSlotModalOpen(true);
  };

  const handleOpenEditSlot = (slot: ScheduleClassSlot) => {
    setActiveSlot(slot);
    setIsSlotModalOpen(true);
  };

  // Manejo de Instituciones
  const handleSaveInstitutions = (institutions: Institution[], updatedSlots?: ScheduleClassSlot[]) => {
    setProfile(prev => ({
      ...prev,
      institutions,
      slots: updatedSlots !== undefined ? updatedSlots : prev.slots,
    }));
    // Si la institución que estaba filtrada fue eliminada, regresar el filtro a "ALL"
    if (selectedInstitutionId !== "ALL" && !institutions.some(i => i.id === selectedInstitutionId)) {
      setSelectedInstitutionId("ALL");
    }
  };

  // Importar perfil JSON
  const handleImportProfile = (imported: InstructorScheduleProfile, mode: "replace" | "merge") => {
    if (mode === "replace") {
      setProfile(imported);
    } else {
      // Combinar instituciones (evitar duplicados por id o nombre)
      const existingInstNames = new Set(profile.institutions.map(i => i.name.toLowerCase()));
      const newInstitutions = [...profile.institutions];
      imported.institutions.forEach(inst => {
        if (!existingInstNames.has(inst.name.toLowerCase())) {
          newInstitutions.push(inst);
        }
      });

      // Añadir slots
      const combinedSlots = [...profile.slots, ...imported.slots.map(s => ({ ...s, id: `slot-${Date.now()}-${Math.random()}` }))];

      setProfile(prev => ({
        ...prev,
        institutions: newInstitutions,
        slots: combinedSlots,
      }));
    }
  };

  // Personalización de datos de cabecera (docente, período, año, notas)
  const handleSaveHeader = (data: {
    instructorName: string;
    periodTitle: string;
    academicYear: string;
    notes: string;
  }) => {
    setProfile(prev => ({
      ...prev,
      ...data,
    }));
  };

  // Restablecer por defecto (sin horario de clases)
  const handleResetDefaults = () => {
    setProfile({
      ...DEFAULT_PROFILE,
      id: `profile-${Date.now()}`,
      instructorName: initialInstructorName || DEFAULT_PROFILE.instructorName,
      academicYear: String(new Date().getFullYear()),
      periodTitle: "Primer Periodo Académico",
      notes: `Horario consolidado semanal multi-institucional para el año ${new Date().getFullYear()}.`,
      slots: [],
    });
  };

  return (
    <DashboardContainer className="min-h-0 pb-10">
      <div className="w-full flex-1 flex flex-col space-y-4">
        {/* Barra Superior con Navegación y Acciones Maestras */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-border/60">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/teacher/tools">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-9 w-9 rounded-xl border-border/70 hover:bg-muted"
                title="Volver a Herramientas"
              >
                <ArrowLeft className="w-4 h-4 text-foreground" />
              </Button>
            </Link>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                  <Calendar className="w-4 h-4" />
                </div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                  Organizador de Horarios Semanales
                </h1>
                <Badge variant="outline" className="text-[11px] font-extrabold bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20">
                  Multi-Institución
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                <span>Docente: <strong className="text-foreground">{profile.instructorName}</strong></span>
                <span>•</span>
                <span>{profile.periodTitle} ({profile.academicYear})</span>
                <button
                  type="button"
                  onClick={() => setIsHeaderModalOpen(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline ml-1"
                  title="Personalizar datos del horario y docente"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Personalizar datos</span>
                </button>
              </div>
            </div>
          </div>

          {/* Botones de Acción Primarios */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsHeaderModalOpen(true)}
              className="h-9 px-3 rounded-xl text-xs font-bold gap-1.5 border-border/80 shadow-2xs hover:bg-muted"
              title="Personalizar docente, período y observaciones del horario"
            >
              <User className="w-3.5 h-3.5 text-primary" />
              <span>Datos Horario</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsInstitutionsModalOpen(true)}
              className="h-9 px-3 rounded-xl text-xs font-bold gap-1.5 border-border/80 shadow-2xs hover:bg-muted"
            >
              <Building2 className="w-3.5 h-3.5 text-primary" />
              <span>Instituciones ({profile.institutions.length})</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsImportExportModalOpen(true)}
              className="h-9 px-3 rounded-xl text-xs font-bold gap-1.5 border-border/80 shadow-2xs hover:bg-muted"
            >
              <FileJson className="w-3.5 h-3.5 text-primary" />
              <span>JSON (I/E)</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPdfModalOpen(true)}
              className="h-9 px-3.5 rounded-xl text-xs font-extrabold gap-1.5 border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Exportar PDF</span>
            </Button>

            <Button
              size="sm"
              onClick={() => handleOpenAddSlot("MONDAY", "08:00")}
              className="h-9 px-4 rounded-xl text-xs font-black gap-1.5 bg-primary text-primary-foreground shadow-sm hover:brightness-105"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Clase</span>
            </Button>
          </div>
        </div>

        {/* Tarjetas KPI de Resumen */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* KPI 1: Horas Totales */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-bold">
              <span>Carga Semanal Total</span>
              <Clock className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-foreground">
                {stats.totalWeeklyHours}
              </span>
              <span className="text-xs font-bold text-muted-foreground">horas / sem</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-1 truncate">
              {stats.activeDaysCount} días activos de docencia
            </div>
          </div>

          {/* KPI 2: Instituciones */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-bold">
              <span>Instituciones</span>
              <Building2 className="w-3.5 h-3.5 text-sky-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-foreground">
                {stats.activeInstitutionsCount}
              </span>
              <span className="text-xs font-bold text-muted-foreground">entidades</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-1 truncate">
              SENA, Centros y Universidades
            </div>
          </div>

          {/* KPI 3: Clases Semanales */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-bold">
              <span>Sesiones de Clase</span>
              <Layers className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-foreground">
                {stats.totalClassesCount}
              </span>
              <span className="text-xs font-bold text-muted-foreground">bloques</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-1 truncate">
              Distribuidos en la semana
            </div>
          </div>

          {/* KPI 4: Estado de Cruces / Conflictos */}
          <div className={`p-3.5 sm:p-4 rounded-2xl border shadow-2xs flex flex-col justify-between transition-colors ${
            stats.conflictsCount > 0
              ? "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
          }`}>
            <div className="flex items-center justify-between text-xs font-bold">
              <span>Solapamientos</span>
              {stats.conflictsCount > 0 ? (
                <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              )}
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black">
                {stats.conflictsCount}
              </span>
              <span className="text-xs font-bold opacity-80">
                {stats.conflictsCount === 1 ? "conflicto" : "conflictos"}
              </span>
            </div>
            <div className="text-[10px] opacity-85 mt-1 truncate font-medium">
              {stats.conflictsCount > 0
                ? "¡Cruce de horario entre clases!"
                : "Sin cruces de horario detectados"}
            </div>
          </div>
        </div>

        {/* Banner de Advertencia de Cruces (si existen) */}
        {conflicts.length > 0 && (
          <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-800 dark:text-red-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
            <div className="space-y-1">
              <span className="font-extrabold">Se han detectado {conflicts.length} conflicto(s) de horario en tu semana:</span>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] opacity-90">
                {conflicts.map((c, i) => (
                  <li key={i}>{c.message}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Barra de Filtros, Distribución por Institución y Modos de Vista */}
        <div className="bg-card/90 dark:bg-card/60 backdrop-blur-xl border border-border/80 rounded-2xl p-3 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Filtro por Institución y Búsqueda */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-1">
            {/* Selector de Institución */}
            <Select value={selectedInstitutionId} onValueChange={setSelectedInstitutionId}>
              <SelectTrigger className="h-8.5 rounded-xl text-xs font-bold bg-muted/40 border-border/80 w-full sm:w-[220px]">
                <div className="flex items-center gap-2 truncate">
                  <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                  <SelectValue placeholder="Todas las instituciones" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-2xl text-xs shadow-xl">
                <SelectItem value="ALL" className="font-bold">
                  Todas las Instituciones ({profile.slots.length})
                </SelectItem>
                {profile.institutions.map(inst => {
                  const scheme = INSTITUTION_COLORS[inst.color] || INSTITUTION_COLORS.emerald;
                  const count = profile.slots.filter(s => s.institutionId === inst.id).length;
                  return (
                    <SelectItem key={inst.id} value={inst.id}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${scheme.dotColor}`} />
                        <span>{inst.shortName || inst.name}</span>
                        <span className="text-[10px] text-muted-foreground">({count})</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* Buscador Rápido */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar asignatura, ficha..."
                className="h-8.5 pl-8 pr-7 text-xs bg-muted/40 border-border/80 rounded-xl"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Chips de Carga por Institución */}
          <div className="hidden xl:flex items-center gap-2 overflow-x-auto">
            {stats.institutionBreakdown.map(item => {
              const scheme = INSTITUTION_COLORS[item.institution.color] || INSTITUTION_COLORS.emerald;
              return (
                <div
                  key={item.institution.id}
                  onClick={() => setSelectedInstitutionId(
                    selectedInstitutionId === item.institution.id ? "ALL" : item.institution.id
                  )}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                    selectedInstitutionId === item.institution.id
                      ? "ring-2 ring-primary shadow-xs"
                      : "opacity-85 hover:opacity-100"
                  } ${scheme.badgeBg} ${scheme.badgeBorder} ${scheme.badgeText}`}
                  title={`Filtrar por ${item.institution.name}`}
                >
                  <div className={`w-2 h-2 rounded-full ${scheme.dotColor}`} />
                  <span>{item.institution.shortName || item.institution.name}:</span>
                  <span className="font-mono">{item.hours}h</span>
                  <span className="text-[9.5px] opacity-75">({item.percentage}%)</span>
                </div>
              );
            })}
          </div>

          {/* Switcher de Vista: Semanal vs Tabla */}
          <div className="inline-flex bg-muted/60 p-1 rounded-xl border border-border/70 shadow-2xs self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === "grid"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Grid className="w-3.5 h-3.5 text-primary" />
              <span>Calendario</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === "table"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="w-3.5 h-3.5 text-primary" />
              <span>Listado ({visibleSlots.length})</span>
            </button>
          </div>
        </div>

        {/* Vista Principal: Calendario o Tabla */}
        {viewMode === "grid" ? (
          <WeeklyGrid
            slots={visibleSlots}
            institutions={profile.institutions}
            conflicts={conflicts}
            selectedInstitutionId={selectedInstitutionId}
            onSelectSlot={handleOpenEditSlot}
            onAddSlotOnDay={handleOpenAddSlot}
          />
        ) : (
          <ScheduleTableView
            slots={visibleSlots}
            institutions={profile.institutions}
            conflicts={conflicts}
            selectedInstitutionId={selectedInstitutionId}
            onSelectSlot={handleOpenEditSlot}
            onDeleteSlot={handleDeleteSlot}
          />
        )}

        {/* Modales */}
        <ClassSlotModal
          isOpen={isSlotModalOpen}
          onClose={() => setIsSlotModalOpen(false)}
          onSave={handleSaveSlot}
          onDelete={handleDeleteSlot}
          onDuplicate={handleDuplicateSlot}
          onOpenInstitutions={() => setIsInstitutionsModalOpen(true)}
          initialSlot={activeSlot}
          defaultDay={defaultSlotDay}
          defaultStartTime={defaultSlotHour}
          institutions={profile.institutions}
        />

        <InstitutionsManagerModal
          isOpen={isInstitutionsModalOpen}
          onClose={() => setIsInstitutionsModalOpen(false)}
          institutions={profile.institutions}
          slots={profile.slots}
          onSaveInstitutions={handleSaveInstitutions}
        />

        <ImportExportModal
          isOpen={isImportExportModalOpen}
          onClose={() => setIsImportExportModalOpen(false)}
          profile={profile}
          onImportProfile={handleImportProfile}
          onResetToDefaults={handleResetDefaults}
        />

        <PDFPreviewModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          profile={profile}
        />

        <ScheduleHeaderModal
          isOpen={isHeaderModalOpen}
          onClose={() => setIsHeaderModalOpen(false)}
          profile={profile}
          activeInstructorName={initialInstructorName}
          onSaveHeader={handleSaveHeader}
        />
      </div>
    </DashboardContainer>
  );
}
