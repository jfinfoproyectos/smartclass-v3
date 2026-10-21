export interface PerformanceDayConfig {
    date: string; // YYYY-MM-DD
    dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
    dayName: string; // "Lunes", "Martes", etc.
    formattedDate: string; // "Lun 20 Oct"
}

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
    daysOfWeek: number[]
): PerformanceDayConfig[] {
    const dates: PerformanceDayConfig[] = [];
    if (!startDateStr || !endDateStr || !Array.isArray(daysOfWeek) || daysOfWeek.length === 0) {
        return dates;
    }

    const [startYear, startMonth, startDay] = startDateStr.split("-").map(Number);
    const [endYear, endMonth, endDay] = endDateStr.split("-").map(Number);

    const start = new Date(startYear, startMonth - 1, startDay);
    const end = new Date(endYear, endMonth - 1, endDay);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
        return dates;
    }

    const current = new Date(start);
    while (current <= end) {
        const dayOfWeek = current.getDay();
        if (daysOfWeek.includes(dayOfWeek)) {
            const year = current.getFullYear();
            const month = String(current.getMonth() + 1).padStart(2, "0");
            const day = String(current.getDate()).padStart(2, "0");
            const dateStr = `${year}-${month}-${day}`;

            dates.push({
                date: dateStr,
                dayOfWeek,
                dayName: DAY_NAMES[dayOfWeek],
                formattedDate: `${DAY_SHORT_NAMES[dayOfWeek]} ${day} ${MONTH_SHORT_NAMES[current.getMonth()]}`,
            });
        }
        current.setDate(current.getDate() + 1);
    }

    return dates;
}
