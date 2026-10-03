import { DayOfWeekKey, Institution, InstructorScheduleProfile, ScheduleClassSlot } from "../types";

export const DAYS_CONFIG: { key: DayOfWeekKey; short: string; label: string; index: number }[] = [
  { key: "MONDAY", short: "Lun", label: "Lunes", index: 0 },
  { key: "TUESDAY", short: "Mar", label: "Martes", index: 1 },
  { key: "WEDNESDAY", short: "Mié", label: "Miércoles", index: 2 },
  { key: "THURSDAY", short: "Jue", label: "Jueves", index: 3 },
  { key: "FRIDAY", short: "Vie", label: "Viernes", index: 4 },
  { key: "SATURDAY", short: "Sáb", label: "Sábado", index: 5 },
  { key: "SUNDAY", short: "Dom", label: "Domingo", index: 6 },
];

export const DAY_NAMES_MAP: Record<DayOfWeekKey, string> = {
  MONDAY: "Lunes",
  TUESDAY: "Martes",
  WEDNESDAY: "Miércoles",
  THURSDAY: "Jueves",
  FRIDAY: "Viernes",
  SATURDAY: "Sábado",
  SUNDAY: "Domingo",
};

export interface ColorSchemeItem {
  id: string;
  name: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  cardBg: string;
  cardBorder: string;
  cardHover: string;
  cardText: string;
  dotColor: string;
  pdfHex: string;
  pdfBgHex: string;
  pdfBorderHex: string;
}

export const INSTITUTION_COLORS: Record<string, ColorSchemeItem> = {
  emerald: {
    id: "emerald",
    name: "Esmeralda / SENA",
    badgeBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    badgeBorder: "border-emerald-500/30",
    badgeText: "text-emerald-700 dark:text-emerald-300",
    cardBg: "bg-emerald-500/15 dark:bg-emerald-950/40",
    cardBorder: "border-emerald-500/40 dark:border-emerald-500/30",
    cardHover: "hover:bg-emerald-500/25 dark:hover:bg-emerald-900/50",
    cardText: "text-emerald-950 dark:text-emerald-100",
    dotColor: "bg-emerald-500",
    pdfHex: "#065f46",
    pdfBgHex: "#ecfdf5",
    pdfBorderHex: "#a7f3d0",
  },
  indigo: {
    id: "indigo",
    name: "Índigo / CESDE",
    badgeBg: "bg-indigo-500/10 dark:bg-indigo-500/20",
    badgeBorder: "border-indigo-500/30",
    badgeText: "text-indigo-700 dark:text-indigo-300",
    cardBg: "bg-indigo-500/15 dark:bg-indigo-950/40",
    cardBorder: "border-indigo-500/40 dark:border-indigo-500/30",
    cardHover: "hover:bg-indigo-500/25 dark:hover:bg-indigo-900/50",
    cardText: "text-indigo-950 dark:text-indigo-100",
    dotColor: "bg-indigo-500",
    pdfHex: "#3730a3",
    pdfBgHex: "#eef2ff",
    pdfBorderHex: "#c7d2fe",
  },
  blue: {
    id: "blue",
    name: "Azul Real / Universidad",
    badgeBg: "bg-blue-500/10 dark:bg-blue-500/20",
    badgeBorder: "border-blue-500/30",
    badgeText: "text-blue-700 dark:text-blue-300",
    cardBg: "bg-blue-500/15 dark:bg-blue-950/40",
    cardBorder: "border-blue-500/40 dark:border-blue-500/30",
    cardHover: "hover:bg-blue-500/25 dark:hover:bg-blue-900/50",
    cardText: "text-blue-950 dark:text-blue-100",
    dotColor: "bg-blue-500",
    pdfHex: "#1e40af",
    pdfBgHex: "#eff6ff",
    pdfBorderHex: "#bfdbfe",
  },
  purple: {
    id: "purple",
    name: "Púrpura / Politécnico",
    badgeBg: "bg-purple-500/10 dark:bg-purple-500/20",
    badgeBorder: "border-purple-500/30",
    badgeText: "text-purple-700 dark:text-purple-300",
    cardBg: "bg-purple-500/15 dark:bg-purple-950/40",
    cardBorder: "border-purple-500/40 dark:border-purple-500/30",
    cardHover: "hover:bg-purple-500/25 dark:hover:bg-purple-900/50",
    cardText: "text-purple-950 dark:text-purple-100",
    dotColor: "bg-purple-500",
    pdfHex: "#6b21a8",
    pdfBgHex: "#faf5ff",
    pdfBorderHex: "#e9d5ff",
  },
  amber: {
    id: "amber",
    name: "Ámbar / Corporación",
    badgeBg: "bg-amber-500/10 dark:bg-amber-500/20",
    badgeBorder: "border-amber-500/30",
    badgeText: "text-amber-700 dark:text-amber-300",
    cardBg: "bg-amber-500/15 dark:bg-amber-950/40",
    cardBorder: "border-amber-500/40 dark:border-amber-500/30",
    cardHover: "hover:bg-amber-500/25 dark:hover:bg-amber-900/50",
    cardText: "text-amber-950 dark:text-amber-100",
    dotColor: "bg-amber-500",
    pdfHex: "#92400e",
    pdfBgHex: "#fffbeb",
    pdfBorderHex: "#fde68a",
  },
  rose: {
    id: "rose",
    name: "Rosa / Instituto",
    badgeBg: "bg-rose-500/10 dark:bg-rose-500/20",
    badgeBorder: "border-rose-500/30",
    badgeText: "text-rose-700 dark:text-rose-300",
    cardBg: "bg-rose-500/15 dark:bg-rose-950/40",
    cardBorder: "border-rose-500/40 dark:border-rose-500/30",
    cardHover: "hover:bg-rose-500/25 dark:hover:bg-rose-900/50",
    cardText: "text-rose-950 dark:text-rose-100",
    dotColor: "bg-rose-500",
    pdfHex: "#9f1239",
    pdfBgHex: "#fff1f2",
    pdfBorderHex: "#fecdd3",
  },
  cyan: {
    id: "cyan",
    name: "Cian / Colegio",
    badgeBg: "bg-cyan-500/10 dark:bg-cyan-500/20",
    badgeBorder: "border-cyan-500/30",
    badgeText: "text-cyan-700 dark:text-cyan-300",
    cardBg: "bg-cyan-500/15 dark:bg-cyan-950/40",
    cardBorder: "border-cyan-500/40 dark:border-cyan-500/30",
    cardHover: "hover:bg-cyan-500/25 dark:hover:bg-cyan-900/50",
    cardText: "text-cyan-950 dark:text-cyan-100",
    dotColor: "bg-cyan-500",
    pdfHex: "#155e75",
    pdfBgHex: "#ecfeff",
    pdfBorderHex: "#a5f3fc",
  },
  teal: {
    id: "teal",
    name: "Verde Azulado / Centro",
    badgeBg: "bg-teal-500/10 dark:bg-teal-500/20",
    badgeBorder: "border-teal-500/30",
    badgeText: "text-teal-700 dark:text-teal-300",
    cardBg: "bg-teal-500/15 dark:bg-teal-950/40",
    cardBorder: "border-teal-500/40 dark:border-teal-500/30",
    cardHover: "hover:bg-teal-500/25 dark:hover:bg-teal-900/50",
    cardText: "text-teal-950 dark:text-teal-100",
    dotColor: "bg-teal-500",
    pdfHex: "#115e59",
    pdfBgHex: "#f0fdfa",
    pdfBorderHex: "#99f6e4",
  },
};

export const DEFAULT_INSTITUTIONS: Institution[] = [
  {
    id: "inst-sena",
    name: "SENA - C.S.G.E Regional Antioquia",
    shortName: "SENA",
    color: "emerald",
    campus: "Complejo Central Calle 51",
  },
  {
    id: "inst-cesde",
    name: "CESDE - Formación Técnica",
    shortName: "CESDE",
    color: "indigo",
    campus: "Sede Centro Medellín",
  },
  {
    id: "inst-udea",
    name: "Universidad de Antioquia",
    shortName: "UdeA",
    color: "blue",
    campus: "Ciudad Universitaria - Bloque 19",
  },
];

export const DEMO_SLOTS: ScheduleClassSlot[] = [
  {
    id: "slot-1",
    institutionId: "inst-sena",
    subject: "ADSO - Arquitectura de Software & Backend",
    groupCode: "Ficha 2670123",
    dayOfWeek: "MONDAY",
    startTime: "06:00",
    endTime: "12:00",
    classroom: "Ambiente 304 - Redes",
    modality: "Presencial",
    notes: "Desarrollo de API REST con Prisma y Next.js",
  },
  {
    id: "slot-2",
    institutionId: "inst-sena",
    subject: "ADSO - Pruebas y Despliegue CI/CD",
    groupCode: "Ficha 2670123",
    dayOfWeek: "WEDNESDAY",
    startTime: "06:00",
    endTime: "12:00",
    classroom: "Ambiente 304 - Redes",
    modality: "Presencial",
    notes: "GitHub Actions y Docker Compose",
  },
  {
    id: "slot-3",
    institutionId: "inst-cesde",
    subject: "Desarrollo Frontend Moderno con React",
    groupCode: "Grupo Web A-12",
    dayOfWeek: "TUESDAY",
    startTime: "18:00",
    endTime: "21:30",
    classroom: "Sala Mac 2 / Teams",
    modality: "Híbrida",
    notes: "Gestión de estado y TailwindCSS",
  },
  {
    id: "slot-4",
    institutionId: "inst-cesde",
    subject: "Desarrollo Frontend Moderno con React",
    groupCode: "Grupo Web A-12",
    dayOfWeek: "THURSDAY",
    startTime: "18:00",
    endTime: "21:30",
    classroom: "Sala Mac 2 / Teams",
    modality: "Híbrida",
    notes: "Evaluación de componentes y proyecto integrador",
  },
  {
    id: "slot-5",
    institutionId: "inst-udea",
    subject: "Algoritmos y Estructuras de Datos Avanzadas",
    groupCode: "Ing. Sistemas 2026-1",
    dayOfWeek: "FRIDAY",
    startTime: "08:00",
    endTime: "12:00",
    classroom: "Laboratorio 19-202",
    modality: "Presencial",
    notes: "Grafos, árboles balanceados y complejidad asintótica",
  },
  {
    id: "slot-6",
    institutionId: "inst-sena",
    subject: "Asesoría de Proyectos Productivos",
    groupCode: "Fichas Varias",
    dayOfWeek: "SATURDAY",
    startTime: "08:00",
    endTime: "12:00",
    classroom: "Sala Virtual Meet",
    modality: "Virtual",
    notes: "Seguimiento a bitácoras de etapa práctica",
  },
];

export const DEFAULT_SLOTS: ScheduleClassSlot[] = [];

export const DEFAULT_PROFILE: InstructorScheduleProfile = {
  id: "profile-main",
  instructorName: "Instructor Docente",
  periodTitle: "Primer Periodo Académico",
  academicYear: "2026",
  notes: "Horario consolidado semanal multi-institucional para el año 2026.",
  institutions: DEFAULT_INSTITUTIONS,
  slots: [],
  updatedAt: new Date().toISOString(),
  version: "1.0",
};
