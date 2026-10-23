export interface PerformanceDayConfig {
    date: string; // YYYY-MM-DD
    dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
    dayName: string; // "Lunes", "Martes", etc.
    formattedDate: string; // "Lun 20 Oct"
}

export interface PerformancePenaltyCriterion {
    id: string;
    name: string;
    penalty: number; // e.g. 1.0 (resta a la nota máxima del día 5.0)
    description?: string;
}

export const DEFAULT_PERFORMANCE_CRITERIA: PerformancePenaltyCriterion[] = [
    { id: "crit-1", name: "No usa la camisa institucional", penalty: 1.0, description: "Portar el uniforme o camisa institucional en clase" },
    { id: "crit-2", name: "No cumple el reglamento de clase", penalty: 1.5, description: "Cumplimiento del reglamento y normas de convivencia" },
    { id: "crit-3", name: "Uso indebido de celular o distracciones", penalty: 0.5, description: "Mantener la atención y evitar distracciones electrónicas" },
    { id: "crit-4", name: "No entrega la evidencia / práctica del día", penalty: 2.0, description: "Cumplimiento de las actividades asignadas para la sesión" },
    { id: "crit-5", name: "Falta de participación o desinterés", penalty: 1.0, description: "Aporte activo en las dinámicas y talleres del aula" },
];

export interface StudentDayPerformance {
    date: string;
    dayOfWeek: number;
    dayName: string;
    formattedDate: string;
    attendanceStatus: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | "LEAVE_EARLY" | "NONE";
    baseGrade: number;
    penalty: number;
    manualGrade: number | null;
    finalDayGrade: number;
    teacherNote: string;
    lockedByAbsence: boolean;
    appliedCriteria?: string[];
}

export interface StudentPerformanceRecord {
    studentId: string;
    studentName: string;
    email: string;
    image: string | null;
    identificacion: string;
    submissionId: string | null;
    currentGrade: number | null;
    lastSubmittedAt: string | null;
    days: StudentDayPerformance[];
    finalAverage: number;
    stats: {
        totalDays: number;
        presentDays: number;
        lateDays: number;
        absentDays: number;
        excusedDays: number;
        customGradesCount: number;
    };
}

export const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
export const DAY_SHORT_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const MONTH_SHORT_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/**
 * Pure utility function to generate dates between start and end that match selected days of week.
 * Runs on both server and client without server action overhead.
 */
export function generatePerformanceClassDates(
    startDateStr: string,
    endDateStr: string,
    daysOfWeek: number[],
    extraDates: string[] = []
): PerformanceDayConfig[] {
    const dates: PerformanceDayConfig[] = [];
    if (!startDateStr || !endDateStr) {
        return dates;
    }

    const safeDaysOfWeek = Array.isArray(daysOfWeek) ? daysOfWeek : [];

    const [startYear, startMonth, startDay] = startDateStr.split("-").map(Number);
    const [endYear, endMonth, endDay] = endDateStr.split("-").map(Number);

    if (isNaN(startYear) || isNaN(startMonth) || isNaN(startDay) || isNaN(endYear) || isNaN(endMonth) || isNaN(endDay)) {
        return dates;
    }

    // Use UTC 12:00:00 (noon) to guarantee that calendar date components NEVER shift across timezones or DST
    let minStart = new Date(Date.UTC(startYear, startMonth - 1, startDay, 12, 0, 0));
    let maxLimit = new Date(Date.UTC(endYear, endMonth - 1, endDay, 12, 0, 0));

    // Normalize extraDates
    const validExtraDates = new Set(
        (extraDates || []).filter(d => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d))
    );

    // Expand bounds if extra recorded dates exist within reasonable window (e.g. up to 14 days before start)
    validExtraDates.forEach(dStr => {
        const [y, m, d] = dStr.split("-").map(Number);
        const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
        if (dt < minStart && (minStart.getTime() - dt.getTime()) <= 14 * 24 * 60 * 60 * 1000) {
            minStart = dt;
        }
        if (dt > maxLimit && (dt.getTime() - maxLimit.getTime()) <= 14 * 24 * 60 * 60 * 1000) {
            maxLimit = dt;
        }
    });

    if (minStart > maxLimit) {
        return dates;
    }

    const current = new Date(minStart);
    while (current <= maxLimit) {
        const dayOfWeek = current.getUTCDay();
        const year = current.getUTCFullYear();
        const month = String(current.getUTCMonth() + 1).padStart(2, "0");
        const day = String(current.getUTCDate()).padStart(2, "0");
        const dateStr = `${year}-${month}-${day}`;

        if (safeDaysOfWeek.includes(dayOfWeek) || validExtraDates.has(dateStr)) {
            dates.push({
                date: dateStr,
                dayOfWeek,
                dayName: DAY_NAMES[dayOfWeek],
                formattedDate: `${DAY_SHORT_NAMES[dayOfWeek]} ${day} ${MONTH_SHORT_NAMES[current.getUTCMonth()]}`,
            });
        }
        current.setUTCDate(current.getUTCDate() + 1);
    }

    return dates;
}

/**
 * Calculates a student's grade for a specific day based on base 5.0, attendance penalties, and applied criteria penalties.
 * Inasistencia strictly locks the grade to 0.0.
 */
export function computeStudentDayGrade(
    day: {
        lockedByAbsence?: boolean;
        attendanceStatus?: string;
        appliedCriteria?: string[];
    },
    criteria: PerformancePenaltyCriterion[] = [],
    tardinessPenalty: number = 1.0,
    baseGrade: number = 5.0
): number {
    if (day.lockedByAbsence || day.attendanceStatus === "ABSENT") {
        return 0.0;
    }

    const latePenalty = day.attendanceStatus === "LATE" ? tardinessPenalty : 0;
    const applied = day.appliedCriteria || [];
    const criteriaPenalty = applied.reduce((sum, critIdOrName) => {
        const found = criteria.find(c => c.id === critIdOrName || c.name === critIdOrName);
        return sum + (found ? found.penalty : 0);
    }, 0);

    const result = Math.max(0.0, Math.min(baseGrade, baseGrade - latePenalty - criteriaPenalty));
    return Number(result.toFixed(2));
}
