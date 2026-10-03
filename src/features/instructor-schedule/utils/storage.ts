import { DEFAULT_PROFILE } from "../constants/defaults";
import { 
  DayOfWeekKey, 
  InstructorScheduleProfile, 
  ScheduleClassSlot, 
  ScheduleConflict, 
  Institution 
} from "../types";

export const LOCAL_STORAGE_KEY = "smartclass_instructor_weekly_schedule_v2";
const PREV_LOCAL_STORAGE_KEY = "smartclass_instructor_weekly_schedule_v1";

/**
 * Convierte "HH:mm" a minutos desde medianoche (0-1440)
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Convierte minutos a formato "HH:mm"
 */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Formatea hora 24h a 12h am/pm legible (estilo AcademixV2)
 */
export function toFormat12h(time24: string): string {
  if (!time24) return "";
  const [h, m] = time24.split(":").map(Number);
  const ap = h >= 12 ? "p.m." : "a.m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${String(m || 0).padStart(2, "0")} ${ap}`;
}

/**
 * Calcula la duración en horas con 1 decimal
 */
export function calculateSlotDurationHours(startTime: string, endTime: string): number {
  const startMins = timeToMinutes(startTime);
  const endMins = timeToMinutes(endTime);
  const diff = Math.max(0, endMins - startMins);
  return Math.round((diff / 60) * 10) / 10;
}

/**
 * Genera la clave de almacenamiento exclusiva para cada instructor
 */
export function getInstructorStorageKey(instructorId?: string): string {
  if (!instructorId || instructorId === "default") {
    return LOCAL_STORAGE_KEY;
  }
  const sanitized = String(instructorId).replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${LOCAL_STORAGE_KEY}_${sanitized}`;
}

/**
 * Carga el perfil desde LocalStorage de forma independiente para cada instructor
 */
export function loadScheduleProfile(
  instructorId?: string,
  fallbackInstructorName?: string
): InstructorScheduleProfile {
  if (typeof window === "undefined") {
    return {
      ...DEFAULT_PROFILE,
      instructorName: fallbackInstructorName || DEFAULT_PROFILE.instructorName,
      slots: [],
    };
  }

  const currentKey = getInstructorStorageKey(instructorId);

  try {
    let raw = localStorage.getItem(currentKey);

    // Si la clave específica del instructor aún no existe, revisar si hay datos previos en la clave base para migrar
    if (!raw && currentKey !== LOCAL_STORAGE_KEY) {
      const globalRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (globalRaw) {
        try {
          const parsedGlobal = JSON.parse(globalRaw);
          if (parsedGlobal && Array.isArray(parsedGlobal.institutions)) {
            raw = globalRaw;
            localStorage.setItem(currentKey, raw);
          }
        } catch {
          // ignorar error de parsing en clave base
        }
      }
    }

    if (!raw) {
      // Si existía la v1 anterior, podemos conservar las instituciones si el usuario las había personalizado,
      // pero garantizando que por defecto no haya horario (slots vacíos).
      let initialInstitutions = DEFAULT_PROFILE.institutions;
      const prevRaw = localStorage.getItem(PREV_LOCAL_STORAGE_KEY);
      if (prevRaw) {
        try {
          const prevParsed = JSON.parse(prevRaw);
          if (Array.isArray(prevParsed?.institutions) && prevParsed.institutions.length > 0) {
            initialInstitutions = prevParsed.institutions;
          }
        } catch {
          // Ignorar error de parsing en clave previa
        }
      }

      const initial: InstructorScheduleProfile = {
        ...DEFAULT_PROFILE,
        id: `profile-${Date.now()}`,
        instructorName: fallbackInstructorName || DEFAULT_PROFILE.instructorName,
        academicYear: String(new Date().getFullYear()),
        periodTitle: "Primer Periodo Académico",
        notes: `Horario consolidado semanal multi-institucional para el año ${new Date().getFullYear()}.`,
        institutions: initialInstitutions,
        slots: [], // Por defecto no debe haber horario
      };
      localStorage.setItem(currentKey, JSON.stringify(initial));
      return initial;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.institutions) || !Array.isArray(parsed.slots)) {
      return { 
        ...DEFAULT_PROFILE, 
        instructorName: fallbackInstructorName || DEFAULT_PROFILE.instructorName,
        slots: [] 
      };
    }

    // Si el nombre guardado es el genérico por defecto y tenemos el nombre del usuario activo, asociarlo
    if ((!parsed.instructorName || parsed.instructorName === "Instructor Docente") && fallbackInstructorName) {
      parsed.instructorName = fallbackInstructorName;
    }

    return parsed;
  } catch (err) {
    console.error("Error al cargar horario de localStorage:", err);
    return { 
      ...DEFAULT_PROFILE, 
      instructorName: fallbackInstructorName || DEFAULT_PROFILE.instructorName,
      slots: [] 
    };
  }
}

/**
 * Guarda el perfil en LocalStorage en la partición correspondiente al instructor activo
 */
export function saveScheduleProfile(profile: InstructorScheduleProfile, instructorId?: string): void {
  if (typeof window === "undefined") return;
  const currentKey = getInstructorStorageKey(instructorId);
  try {
    const updated = {
      ...profile,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(currentKey, JSON.stringify(updated));
  } catch (err) {
    console.error("Error al guardar horario en localStorage:", err);
  }
}

/**
 * Detecta solapamientos o colisiones entre clases del mismo día
 */
export function detectScheduleConflicts(
  slots: ScheduleClassSlot[], 
  institutions: Institution[]
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  const instMap = new Map(institutions.map(i => [i.id, i.shortName || i.name]));

  // Agrupar por día
  const slotsByDay: Record<string, ScheduleClassSlot[]> = {};
  slots.forEach(slot => {
    if (!slotsByDay[slot.dayOfWeek]) slotsByDay[slot.dayOfWeek] = [];
    slotsByDay[slot.dayOfWeek].push(slot);
  });

  Object.entries(slotsByDay).forEach(([day, daySlots]) => {
    for (let i = 0; i < daySlots.length; i++) {
      for (let j = i + 1; j < daySlots.length; j++) {
        const a = daySlots[i];
        const b = daySlots[j];

        const startA = timeToMinutes(a.startTime);
        const endA = timeToMinutes(a.endTime);
        const startB = timeToMinutes(b.startTime);
        const endB = timeToMinutes(b.endTime);

        // Se solapan si el inicio de uno es menor que el fin del otro en ambos sentidos
        if (startA < endB && endA > startB) {
          const instA = instMap.get(a.institutionId) || "Inst. A";
          const instB = instMap.get(b.institutionId) || "Inst. B";
          conflicts.push({
            slotA: a,
            slotB: b,
            dayOfWeek: day as DayOfWeekKey,
            message: `Cruce horario entre [${instA}: ${a.subject}] (${a.startTime}-${a.endTime}) y [${instB}: ${b.subject}] (${b.startTime}-${b.endTime})`,
          });
        }
      }
    }
  });

  return conflicts;
}

/**
 * Descarga el archivo JSON estructurado del horario
 */
export function exportScheduleToJson(profile: InstructorScheduleProfile): void {
  const exportPayload = {
    app: "SmartClass-WeeklySchedulePlanner",
    exportedAt: new Date().toISOString(),
    version: "1.0",
    data: profile,
  };

  const jsonStr = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const sanitizedName = (profile.instructorName || "instructor").toLowerCase().replace(/[^a-z0-9]/g, "_");
  const year = profile.academicYear || new Date().getFullYear();
  link.href = url;
  link.download = `horario_semanal_${sanitizedName}_${year}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Valida y parsea un archivo JSON importado
 */
export function validateAndParseImportedJson(jsonString: string): {
  success: boolean;
  profile?: InstructorScheduleProfile;
  error?: string;
} {
  try {
    const raw = JSON.parse(jsonString);
    const data = raw.data || raw;

    if (!data || typeof data !== "object") {
      return { success: false, error: "El archivo no contiene un objeto JSON válido." };
    }

    if (!Array.isArray(data.institutions)) {
      return { success: false, error: "El formato debe incluir la lista de instituciones (array 'institutions')." };
    }

    if (!Array.isArray(data.slots)) {
      return { success: false, error: "El formato debe incluir la lista de clases semanales (array 'slots')." };
    }

    // Asegurar estructura mínima requerida
    const validatedProfile: InstructorScheduleProfile = {
      id: data.id || `profile-${Date.now()}`,
      instructorName: data.instructorName || "Instructor",
      periodTitle: data.periodTitle || "Periodo Académico",
      academicYear: data.academicYear || String(new Date().getFullYear()),
      notes: data.notes || "",
      institutions: (data.institutions as Record<string, unknown>[]).map((inst, idx: number) => ({
        id: (inst.id as string) || `inst-${idx}-${Date.now()}`,
        name: (inst.name as string) || `Institución ${idx + 1}`,
        shortName: (inst.shortName as string) || (typeof inst.name === "string" ? inst.name.slice(0, 8) : "") || `INST-${idx + 1}`,
        color: (inst.color as string) || "emerald",
        campus: (inst.campus as string) || "",
        contractType: (inst.contractType as string) || "",
        hourlyRate: typeof inst.hourlyRate === "number" ? inst.hourlyRate : undefined,
      })),
      slots: (data.slots as Record<string, unknown>[]).map((s, idx: number) => ({
        id: (s.id as string) || `slot-${idx}-${Date.now()}`,
        institutionId: (s.institutionId as string) || ((data.institutions[0] as Record<string, unknown>)?.id as string || "inst-default"),
        subject: (s.subject as string) || "Asignatura",
        groupCode: (s.groupCode as string) || "Grupo",
        dayOfWeek: (s.dayOfWeek as DayOfWeekKey) || "MONDAY",
        startTime: (s.startTime as string) || "08:00",
        endTime: (s.endTime as string) || "10:00",
        classroom: (s.classroom as string) || "",
        modality: (s.modality as "Presencial" | "Virtual" | "Híbrida") || "Presencial",
        notes: (s.notes as string) || "",
        colorOverride: s.colorOverride as string | undefined,
      })),
      updatedAt: new Date().toISOString(),
      version: (data.version as string) || "1.0",
    };

    return { success: true, profile: validatedProfile };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Error de sintaxis JSON: ${message}` };
  }
}

/**
 * Estadísticas calculadas para el dashboard
 */
export interface ScheduleStats {
  totalWeeklyHours: number;
  totalClassesCount: number;
  activeInstitutionsCount: number;
  activeDaysCount: number;
  conflictsCount: number;
  institutionBreakdown: {
    institution: Institution;
    hours: number;
    classesCount: number;
    percentage: number;
  }[];
}

export function computeScheduleStats(
  slots: ScheduleClassSlot[], 
  institutions: Institution[]
): ScheduleStats {
  const totalClassesCount = slots.length;
  let totalWeeklyMins = 0;
  const activeDays = new Set<string>();
  const minsByInst: Record<string, { mins: number; count: number }> = {};

  institutions.forEach(i => {
    minsByInst[i.id] = { mins: 0, count: 0 };
  });

  slots.forEach(slot => {
    const startMins = timeToMinutes(slot.startTime);
    const endMins = timeToMinutes(slot.endTime);
    const duration = Math.max(0, endMins - startMins);
    totalWeeklyMins += duration;
    activeDays.add(slot.dayOfWeek);

    if (!minsByInst[slot.institutionId]) {
      minsByInst[slot.institutionId] = { mins: 0, count: 0 };
    }
    minsByInst[slot.institutionId].mins += duration;
    minsByInst[slot.institutionId].count += 1;
  });

  const totalWeeklyHours = Math.round((totalWeeklyMins / 60) * 10) / 10;

  const institutionBreakdown = institutions.map(inst => {
    const data = minsByInst[inst.id] || { mins: 0, count: 0 };
    const hours = Math.round((data.mins / 60) * 10) / 10;
    const percentage = totalWeeklyMins > 0 ? Math.round((data.mins / totalWeeklyMins) * 100) : 0;
    return {
      institution: inst,
      hours,
      classesCount: data.count,
      percentage,
    };
  });

  const conflicts = detectScheduleConflicts(slots, institutions);

  return {
    totalWeeklyHours,
    totalClassesCount,
    activeInstitutionsCount: institutions.length,
    activeDaysCount: activeDays.size,
    conflictsCount: conflicts.length,
    institutionBreakdown,
  };
}
