import { CorporateColorScheme } from "../types";

export interface ColorPalette {
  id: CorporateColorScheme;
  name: string;
  primary: string;       // Encabezados y títulos principales
  secondary: string;     // Subtítulos y acentos secundarios
  accent: string;        // Color insignia / barras decorativas / badges
  accentLight: string;   // Fondos de badges activos y tarjetas
  accentBorder: string;  // Bordes de acento
  surfaceAlt: string;    // Fondo alternativo de tablas / cards
  text: string;          // Color texto base
  textMuted: string;     // Texto secundario / metadatos
  border: string;        // Bordes estándar
  borderDark: string;    // Bordes destacados
  heroBgGradientStart: string;
  heroBgGradientEnd: string;
}

export const CORPORATE_COLOR_SCHEMES: Record<CorporateColorScheme, ColorPalette> = {
  teal: {
    id: "teal",
    name: "SmartClass Teal",
    primary: "#0f172a",
    secondary: "#1e293b",
    accent: "#0d9488",
    accentLight: "#f0fdfa",
    accentBorder: "#ccfbf1",
    surfaceAlt: "#f8fafc",
    text: "#334155",
    textMuted: "#64748b",
    border: "#e2e8f0",
    borderDark: "#cbd5e1",
    heroBgGradientStart: "#042f2e",
    heroBgGradientEnd: "#0d9488",
  },
  slate: {
    id: "slate",
    name: "Executive Slate",
    primary: "#020617",
    secondary: "#0f172a",
    accent: "#475569",
    accentLight: "#f8fafc",
    accentBorder: "#e2e8f0",
    surfaceAlt: "#f1f5f9",
    text: "#1e293b",
    textMuted: "#64748b",
    border: "#cbd5e1",
    borderDark: "#94a3b8",
    heroBgGradientStart: "#0f172a",
    heroBgGradientEnd: "#334155",
  },
  navy: {
    id: "navy",
    name: "Enterprise Navy",
    primary: "#0b192c",
    secondary: "#1e3e62",
    accent: "#005691",
    accentLight: "#eff6ff",
    accentBorder: "#bfdbfe",
    surfaceAlt: "#f8fafc",
    text: "#1e293b",
    textMuted: "#64748b",
    border: "#dbeafe",
    borderDark: "#93c5fd",
    heroBgGradientStart: "#0b192c",
    heroBgGradientEnd: "#1e3e62",
  },
  crimson: {
    id: "crimson",
    name: "Corporate Crimson",
    primary: "#450a0a",
    secondary: "#7f1d1d",
    accent: "#b91c1c",
    accentLight: "#fef2f2",
    accentBorder: "#fecaca",
    surfaceAlt: "#fff1f2",
    text: "#292524",
    textMuted: "#78716c",
    border: "#fee2e2",
    borderDark: "#fca5a5",
    heroBgGradientStart: "#450a0a",
    heroBgGradientEnd: "#991b1b",
  },
  emerald: {
    id: "emerald",
    name: "Forest Emerald",
    primary: "#022c22",
    secondary: "#064e3b",
    accent: "#059669",
    accentLight: "#ecfdf5",
    accentBorder: "#a7f3d0",
    surfaceAlt: "#f0fdf4",
    text: "#1f2937",
    textMuted: "#4b5563",
    border: "#d1fae5",
    borderDark: "#6ee7b7",
    heroBgGradientStart: "#022c22",
    heroBgGradientEnd: "#059669",
  },
  indigo: {
    id: "indigo",
    name: "Royal Indigo",
    primary: "#1e1b4b",
    secondary: "#312e81",
    accent: "#4f46e5",
    accentLight: "#eef2ff",
    accentBorder: "#c7d2fe",
    surfaceAlt: "#f8fafc",
    text: "#1e293b",
    textMuted: "#64748b",
    border: "#e0e7ff",
    borderDark: "#a5b4fc",
    heroBgGradientStart: "#1e1b4b",
    heroBgGradientEnd: "#4f46e5",
  },
  amber: {
    id: "amber",
    name: "Gold Amber",
    primary: "#451a03",
    secondary: "#78350f",
    accent: "#d97706",
    accentLight: "#fffbeb",
    accentBorder: "#fde68a",
    surfaceAlt: "#fefce8",
    text: "#292524",
    textMuted: "#78716c",
    border: "#fef3c7",
    borderDark: "#fcd34d",
    heroBgGradientStart: "#451a03",
    heroBgGradientEnd: "#d97706",
  },
  cyber: {
    id: "cyber",
    name: "Cyber Obsidian",
    primary: "#09090b",
    secondary: "#18181b",
    accent: "#06b6d4",
    accentLight: "#ecfeff",
    accentBorder: "#a5f3fc",
    surfaceAlt: "#fafafa",
    text: "#18181b",
    textMuted: "#71717a",
    border: "#e4e4e7",
    borderDark: "#a1a1aa",
    heroBgGradientStart: "#09090b",
    heroBgGradientEnd: "#18181b",
  },
};

export const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  OFFICIAL: {
    label: "DOCUMENTO OFICIAL",
    bg: "#f0fdfa",
    text: "#0f766e",
    border: "#99f6e4",
  },
  CONFIDENTIAL: {
    label: "ESTRICTAMENTE CONFIDENCIAL",
    bg: "#fef2f2",
    text: "#b91c1c",
    border: "#fecaca",
  },
  APPROVED: {
    label: "APROBADO PARA PRODUCCIÓN",
    bg: "#ecfdf5",
    text: "#047857",
    border: "#a7f3d0",
  },
  DRAFT: {
    label: "BORRADOR DE TRABAJO",
    bg: "#fffbeb",
    text: "#b45309",
    border: "#fde68a",
  },
  REVIEW: {
    label: "EN REVISIÓN TÉCNICA",
    bg: "#eff6ff",
    text: "#1d4ed8",
    border: "#bfdbfe",
  },
};
