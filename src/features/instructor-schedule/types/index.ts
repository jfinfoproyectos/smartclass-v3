export type DayOfWeekKey = 
  | "MONDAY" 
  | "TUESDAY" 
  | "WEDNESDAY" 
  | "THURSDAY" 
  | "FRIDAY" 
  | "SATURDAY" 
  | "SUNDAY";

export type ModalityType = "Presencial" | "Virtual" | "Híbrida";

export interface Institution {
  id: string;
  name: string;
  shortName: string;
  color: string; // Tailwind color key: emerald | blue | indigo | purple | amber | rose | cyan | teal | orange
  campus?: string;
  contractType?: string; // e.g. "Contratista", "Cátedra", "Planta"
  hourlyRate?: number;
}

export interface ScheduleClassSlot {
  id: string;
  institutionId: string;
  subject: string;
  groupCode: string;
  dayOfWeek: DayOfWeekKey;
  startTime: string; // "HH:mm" (24h)
  endTime: string;   // "HH:mm" (24h)
  classroom?: string;
  modality: ModalityType;
  notes?: string;
  colorOverride?: string;
}

export interface InstructorScheduleProfile {
  id: string;
  instructorName: string;
  periodTitle: string; // e.g. "Semestre I - 2026"
  academicYear: string; // e.g. "2026"
  notes?: string;
  institutions: Institution[];
  slots: ScheduleClassSlot[];
  updatedAt: string;
  version: string;
}

export interface ScheduleConflict {
  slotA: ScheduleClassSlot;
  slotB: ScheduleClassSlot;
  dayOfWeek: DayOfWeekKey;
  message: string;
}
