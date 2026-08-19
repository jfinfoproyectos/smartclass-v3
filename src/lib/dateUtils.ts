import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Utilidades para el manejo consistente de fechas y zonas horarias.
 * Objetivo: Evitar el desfase de días entre local y servidor (UTC).
 */

export const DEFAULT_TIMEZONE = "America/Bogota";

/**
 * Retorna la fecha actual como string "YYYY-MM-DD" en la zona horaria regional.
 * Garantiza coincidencia exacta entre cliente local y servidores UTC (Vercel).
 */
export function getTodayDateString(timeZone: string = DEFAULT_TIMEZONE): string {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });
    return formatter.format(new Date());
}

/**
 * Convierte un objeto Date o string "YYYY-MM-DD" a medianoche UTC para Prisma,
 * interpretando el objeto en la zona horaria regional (default: America/Bogota).
 */
export function toUTCStartOfDayFromRegional(date: Date | string = new Date(), timeZone: string = DEFAULT_TIMEZONE): Date {
    if (typeof date === "string") {
        const dateOnly = date.split("T")[0];
        const parts = dateOnly.split("-").map(Number);
        if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
            return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0));
        }
        date = new Date(date);
    }

    if (isNaN(date.getTime())) {
        date = new Date();
    }

    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "numeric",
        day: "numeric"
    }).formatToParts(date);

    let month = 0, day = 1, year = 1970;
    for (const p of parts) {
        if (p.type === "year") year = parseInt(p.value, 10);
        if (p.type === "month") month = parseInt(p.value, 10) - 1;
        if (p.type === "day") day = parseInt(p.value, 10);
    }

    return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
}

/**
 * Formatea horas de registro (llegada/salida) respetando la zona horaria regional.
 */
export function formatTimeRegional(date: Date | string | null | undefined, timeZone: string = DEFAULT_TIMEZONE): string {
    if (!date) return "--:--";
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "--:--";

    return new Intl.DateTimeFormat("es-CO", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    }).format(d);
}

/**
 * Convierte los componentes UTC de un objeto Date a la medianoche UTC.
 */
export function toUTCStartOfDay(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

/**
 * Convierte los componentes LOCALES de un objeto Date a la medianoche UTC.
 */
export function toUTCStartOfDayFromLocal(date: Date): Date {
    return toUTCStartOfDayFromRegional(date);
}

/**
 * Procesa una fecha que viene del servidor (asumida en UTC medianoche) para su visualización.
 * Crea una fecha local con los mismos componentes visuales que la fecha UTC.
 * 
 * Ejemplo:
 * Entrada (UTC): 2023-10-27 00:00:00Z
 * Salida (Local): 2023-10-27 00:00:00 (Hora local, para que se ve "27")
 * 
 * Úsalo para visualizar fechas en componentes de UI (Calendarios, Tablas).
 */
export function fromUTC(date: Date | string): Date {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * Formatea una fecha asumiendo que es una "Fecha de Calendario".
 * Utiliza los componentes UTC para el formato, ignorando la zona horaria local.
 * 
 * @param date Fecha a formatear
 * @param formatStr String de formato date-fns (default: PPP = "27 de octubre de 2023")
 */
export function formatCalendarDate(date: Date | string, formatStr: string = "PPP"): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    // Si la fecha es válida, extraemos componentes UTC y creamos una fecha local "falsa" para formatear
    if (isNaN(d.getTime())) return "Fecha inválida";
    
    // Creamos fecha local con los datos UTC para que 'format' saque los nombres correctos
    const visualDate = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0); 
    // Ponemos hora 12:00 para evitar bordes raros de DST, aunque con componentes manuales es seguro.
    
    return format(visualDate, formatStr, { locale: es });
}

/**
 * Parsea un string YYYY-MM-DD directamente a UTC Midnight.
 */
export function parseISOAsUTC(dateString: string): Date {
    if (!dateString) return new Date();
    // new Date("YYYY-MM-DD") en ISO estándar devuelve UTC 00:00
    // Aseguramos que sea tratado así.
    return new Date(dateString);
}
/**
 * Formatea una fecha con hora.
 */
export function formatDateTime(date: Date | string, formatStr: string = "dd/MM/yyyy HH:mm"): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return "Fecha inválida";
    return format(d, formatStr, { locale: es });
}

export function getCourseClassDates(
    startDate: Date | string | null | undefined,
    endDate: Date | string | null | undefined,
    classDaysStr: string | null | undefined
): string[] {
    if (!startDate || !endDate || !classDaysStr) return [];
    
    // Parse to local date objects for comparison using UTC to prevent timezone shifts
    const start = typeof startDate === "string" ? new Date(startDate) : startDate;
    const end = typeof endDate === "string" ? new Date(endDate) : endDate;
    
    const classDays = classDaysStr.split(",").map(Number); // e.g. [1, 5]
    
    const dates: string[] = [];
    // Ensure we start at midnight UTC
    const current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
    const limit = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
    
    while (current <= limit) {
        // getUTCDay: 0 = Domingo, 1 = Lunes, etc.
        if (classDays.includes(current.getUTCDay())) {
            const y = current.getUTCFullYear();
            const m = String(current.getUTCMonth() + 1).padStart(2, '0');
            const d = String(current.getUTCDate()).padStart(2, '0');
            dates.push(`${y}-${m}-${d}`);
        }
        current.setUTCDate(current.getUTCDate() + 1);
    }
    return dates;
}
