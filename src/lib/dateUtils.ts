import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Utilidades para el manejo consistente de fechas y zonas horarias.
 * Objetivo: Evitar el desfase de días entre local y servidor (UTC).
 */

/**
 * Convierte los componentes UTC de un objeto Date a la medianoche UTC.
 * Úsalo cuando la fecha YA es una "Fecha de Calendario" en UTC (como las de Prisma)
 * o cuando recibes una fecha ISO y quieres asegurar que se mantiene en UTC 00:00.
 */
export function toUTCStartOfDay(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

/**
 * Convierte los componentes LOCALES de un objeto Date a la medianoche UTC.
 * Úsalo para normalizar "hoy" (new Date()) o fechas provenientes de inputs locales
 * (como date pickers) al registro de base de datos UTC.
 */
export function toUTCStartOfDayFromLocal(date: Date): Date {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0));
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
