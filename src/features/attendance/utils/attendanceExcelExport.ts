import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { formatCalendarDate, formatTimeRegional, toUTCStartOfDayFromRegional } from '@/lib/dateUtils';

// Corporate Palette (ARGB format for ExcelJS)
const COLORS = {
    primary: 'FF0F172A',      // Deep Slate
    secondary: 'FF1E3A5F',    // Navy
    accent: 'FF2563EB',       // Royal Blue
    accentLight: 'FFEFF6FF',  // Light Blue
    darkHeader: 'FF1E293B',   // Slate Header
    subHeader: 'FF334155',    // Muted Slate
    white: 'FFFFFFFF',
    border: 'FFE2E8F0',       // Light border
    borderDark: 'FFCBD5E1',
    zebra: 'FFF8FAFC',        // Slate 50
    
    // Status colors
    presenteBg: 'FFD1FAE5',
    presenteText: 'FF065F46',
    
    faltaBg: 'FFFFE4E6',
    faltaText: 'FF9F1239',
    
    tardeBg: 'FFFEF3C7',
    tardeText: 'FF92400E',
    
    retiroBg: 'FFE0E7FF',
    retiroText: 'FF3730A3',

    tardeRetiroBg: 'FFFFEDD5',
    tardeRetiroText: 'FF9A3412',
    
    excusadoBg: 'FFE0F2FE',
    excusadoText: 'FF0369A1',
};

// Common cell border helper
const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: COLORS.border } },
    left: { style: 'thin', color: { argb: COLORS.border } },
    bottom: { style: 'thin', color: { argb: COLORS.border } },
    right: { style: 'thin', color: { argb: COLORS.border } },
};

export interface StudentExcelInfo {
    id: string;
    name: string | null;
    email: string;
    profile?: {
        identificacion?: string;
        nombres?: string;
        apellido?: string;
    } | null;
}

export interface AttendanceRecordExcel {
    id: string;
    userId?: string;
    date: string | Date;
    status: string;
    arrivalTime?: string | Date | null;
    departureTime?: string | Date | null;
    justification?: string | null;
    justificationUrl?: string | null;
}

/**
 * Triggers client-side download of an ExcelJS buffer
 */
function downloadWorkbookBuffer(buffer: ExcelJS.Buffer, filename: string) {
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Helper to get clean student full name
 */
function getStudentName(student: StudentExcelInfo): string {
    if (student.profile?.nombres && student.profile?.apellido) {
        return `${student.profile.nombres} ${student.profile.apellido}`.trim();
    }
    return student.name || 'Estudiante';
}

/**
 * 1. Export Individual Student Attendance History to Corporate Excel
 */
export async function exportStudentAttendanceToExcel({
    student,
    courseTitle,
    teacherName = "Docente Titular",
    records = [],
    stats,
}: {
    student: StudentExcelInfo;
    courseTitle: string;
    teacherName?: string;
    records: AttendanceRecordExcel[];
    stats?: {
        absences: number;
        late: number;
        leaveEarly: number;
        excused?: number;
        totalSessions?: number;
        percentage?: number;
    };
}) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SmartClass Academic Suite';
    workbook.created = new Date();

    const studentFullName = getStudentName(student);
    const studentId = student.profile?.identificacion || student.id;
    const worksheet = workbook.addWorksheet('Historial Individual');

    // Page view settings: freeze pane below headers
    worksheet.views = [{ showGridLines: true }];

    // Column widths
    worksheet.columns = [
        { key: 'A', width: 14 },
        { key: 'B', width: 22 },
        { key: 'C', width: 26 },
        { key: 'D', width: 36 },
        { key: 'E', width: 26 },
    ];

    // 1. BANNER INSTITUCIONAL
    const titleRow = worksheet.addRow(['SMARTCLASS ACADEMIC SUITE • REPORTE OFICIAL DE ASISTENCIA']);
    worksheet.mergeCells('A1:E1');
    titleRow.height = 36;
    titleRow.font = { name: 'Calibri', size: 13, bold: true, color: { argb: COLORS.white } };
    titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primary } };
    titleRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Subtitle
    const subRow = worksheet.addRow([`Historial Individual de Asistencia — Materia: ${courseTitle}`]);
    worksheet.mergeCells('A2:E2');
    subRow.height = 22;
    subRow.font = { name: 'Calibri', size: 10, italic: true, bold: true, color: { argb: COLORS.white } };
    subRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.secondary } };
    subRow.alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.addRow([]); // Blank line

    // 2. METADATA BLOCK
    const metaTitle = worksheet.addRow(['DATOS DEL ESTUDIANTE Y ASIGNATURA']);
    worksheet.mergeCells('A4:E4');
    metaTitle.height = 20;
    metaTitle.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: COLORS.primary } };
    metaTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.accentLight } };
    metaTitle.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    const metaRow1 = worksheet.addRow(['Estudiante:', studentFullName, '', 'Identificación / ID:', studentId]);
    worksheet.mergeCells('B5:C5');
    metaRow1.height = 20;
    metaRow1.getCell('A').font = { bold: true, size: 9.5, color: { argb: COLORS.subHeader } };
    metaRow1.getCell('B').font = { bold: true, size: 9.5, color: { argb: COLORS.primary } };
    metaRow1.getCell('D').font = { bold: true, size: 9.5, color: { argb: COLORS.subHeader } };
    metaRow1.getCell('E').font = { size: 9.5, color: { argb: COLORS.primary } };

    const metaRow2 = worksheet.addRow(['Correo Electrónico:', student.email, '', 'Docente / Responsable:', teacherName]);
    worksheet.mergeCells('B6:C6');
    metaRow2.height = 20;
    metaRow2.getCell('A').font = { bold: true, size: 9.5, color: { argb: COLORS.subHeader } };
    metaRow2.getCell('B').font = { size: 9.5, color: { argb: COLORS.primary } };
    metaRow2.getCell('D').font = { bold: true, size: 9.5, color: { argb: COLORS.subHeader } };
    metaRow2.getCell('E').font = { size: 9.5, color: { argb: COLORS.primary } };

    const metaRow3 = worksheet.addRow(['Fecha de Emisión:', format(new Date(), 'dd/MM/yyyy HH:mm:ss'), '', 'Código de Referencia:', `ATT-${student.id.substring(0, 8).toUpperCase()}`]);
    worksheet.mergeCells('B7:C7');
    metaRow3.height = 20;
    metaRow3.getCell('A').font = { bold: true, size: 9.5, color: { argb: COLORS.subHeader } };
    metaRow3.getCell('B').font = { size: 9.5, color: { argb: COLORS.primary } };
    metaRow3.getCell('D').font = { bold: true, size: 9.5, color: { argb: COLORS.subHeader } };
    metaRow3.getCell('E').font = { size: 9.5, bold: true, color: { argb: COLORS.accent } };

    // Apply borders to metadata
    [4, 5, 6, 7].forEach(rowNum => {
        const r = worksheet.getRow(rowNum);
        r.eachCell({ includeEmpty: true }, (cell) => {
            cell.border = thinBorder;
        });
    });

    worksheet.addRow([]); // Blank line

    // 3. KPI SUMMARY CARDS (Row 9 & 10)
    const absencesCount = stats?.absences ?? records.filter(r => r.status === "ABSENT").length;
    const lateCount = stats?.late ?? records.filter(r => r.status === "LATE" || Boolean(r.arrivalTime)).length;
    const leaveEarlyCount = stats?.leaveEarly ?? records.filter(r => r.status === "LEAVE_EARLY" || Boolean(r.departureTime)).length;
    const excusedCount = stats?.excused ?? records.filter(r => r.status === "EXCUSED" || Boolean(r.justification)).length;
    const totalSessions = stats?.totalSessions || records.length || 1;
    const attended = Math.max(0, totalSessions - absencesCount);
    const percentage = stats?.percentage !== undefined 
        ? stats.percentage 
        : Math.round((attended / totalSessions) * 100);

    const kpiLabels = worksheet.addRow(['% ASISTENCIA', 'TOTAL CLASES', 'INASISTENCIAS (FALTAS)', 'LLEGADAS TARDE', 'RETIROS ANTICIPADOS']);
    kpiLabels.height = 18;
    kpiLabels.eachCell((cell) => {
        cell.font = { name: 'Calibri', size: 8.5, bold: true, color: { argb: COLORS.white } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.darkHeader } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = thinBorder;
    });

    const kpiValues = worksheet.addRow([`${percentage}%`, totalSessions, absencesCount, lateCount, leaveEarlyCount]);
    kpiValues.height = 30;
    
    // Format KPI cells
    const kpiCellA = kpiValues.getCell(1);
    kpiCellA.font = { name: 'Calibri', size: 14, bold: true, color: { argb: percentage >= 80 ? COLORS.presenteText : COLORS.faltaText } };
    kpiCellA.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: percentage >= 80 ? COLORS.presenteBg : COLORS.faltaBg } };
    kpiCellA.alignment = { vertical: 'middle', horizontal: 'center' };
    kpiCellA.border = thinBorder;

    const kpiCellB = kpiValues.getCell(2);
    kpiCellB.font = { name: 'Calibri', size: 14, bold: true, color: { argb: COLORS.primary } };
    kpiCellB.alignment = { vertical: 'middle', horizontal: 'center' };
    kpiCellB.border = thinBorder;

    const kpiCellC = kpiValues.getCell(3);
    kpiCellC.font = { name: 'Calibri', size: 14, bold: true, color: { argb: COLORS.faltaText } };
    kpiCellC.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.faltaBg } };
    kpiCellC.alignment = { vertical: 'middle', horizontal: 'center' };
    kpiCellC.border = thinBorder;

    const kpiCellD = kpiValues.getCell(4);
    kpiCellD.font = { name: 'Calibri', size: 14, bold: true, color: { argb: COLORS.tardeText } };
    kpiCellD.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.tardeBg } };
    kpiCellD.alignment = { vertical: 'middle', horizontal: 'center' };
    kpiCellD.border = thinBorder;

    const kpiCellE = kpiValues.getCell(5);
    kpiCellE.font = { name: 'Calibri', size: 14, bold: true, color: { argb: COLORS.retiroText } };
    kpiCellE.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.retiroBg } };
    kpiCellE.alignment = { vertical: 'middle', horizontal: 'center' };
    kpiCellE.border = thinBorder;

    worksheet.addRow([]); // Blank line

    // 4. TABLE HEADER (Row 13)
    const tableHeader = worksheet.addRow(['FECHA', 'ESTADO / NOVEDAD', 'DETALLE / HORARIO', 'JUSTIFICACIÓN', 'SOPORTE ADJUNTO']);
    tableHeader.height = 24;
    tableHeader.eachCell((cell) => {
        cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: COLORS.white } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primary } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = thinBorder;
    });

    // 5. TABLE DATA
    if (records.length === 0) {
        const emptyRow = worksheet.addRow(['Sin registros de novedad de asistencia para este estudiante.', '', '', '', '']);
        worksheet.mergeCells(`A${emptyRow.number}:E${emptyRow.number}`);
        emptyRow.height = 26;
        emptyRow.font = { italic: true, color: { argb: COLORS.subHeader } };
        emptyRow.alignment = { vertical: 'middle', horizontal: 'center' };
        emptyRow.getCell(1).border = thinBorder;
    } else {
        // Sort chronologically descending
        const sortedRecords = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        sortedRecords.forEach((rec, idx) => {
            const isLate = Boolean(rec.arrivalTime) || rec.status === "LATE";
            const isLeaveEarly = Boolean(rec.departureTime) || rec.status === "LEAVE_EARLY";
            const isBoth = isLate && isLeaveEarly;
            const isAbsent = rec.status === "ABSENT";
            const isExcused = rec.status === "EXCUSED";
            const isPresent = rec.status === "PRESENT" && !isLate && !isLeaveEarly;

            let novedadLabel = "PRESENTE";
            let statusBg = COLORS.presenteBg;
            let statusFg = COLORS.presenteText;

            if (isAbsent) {
                novedadLabel = "FALTA";
                statusBg = COLORS.faltaBg;
                statusFg = COLORS.faltaText;
            } else if (isBoth) {
                novedadLabel = "TARDE + RETIRO";
                statusBg = COLORS.tardeRetiroBg;
                statusFg = COLORS.tardeRetiroText;
            } else if (isLate) {
                novedadLabel = "LLEGADA TARDE";
                statusBg = COLORS.tardeBg;
                statusFg = COLORS.tardeText;
            } else if (isLeaveEarly) {
                novedadLabel = "RETIRO ANTICIPADO";
                statusBg = COLORS.retiroBg;
                statusFg = COLORS.retiroText;
            } else if (isExcused) {
                novedadLabel = "EXCUSADO";
                statusBg = COLORS.excusadoBg;
                statusFg = COLORS.excusadoText;
            }

            const formattedDate = formatCalendarDate(toUTCStartOfDayFromRegional(rec.date), "dd/MM/yyyy");
            const arrTimeStr = rec.arrivalTime ? formatTimeRegional(rec.arrivalTime) : null;
            const depTimeStr = rec.departureTime ? formatTimeRegional(rec.departureTime) : null;

            let detalleStr = "—";
            if (isBoth) {
                detalleStr = `Llegada: ${arrTimeStr || '—'} | Salida: ${depTimeStr || '—'}`;
            } else if (isLate) {
                detalleStr = `Hora llegada: ${arrTimeStr || '—'}`;
            } else if (isLeaveEarly) {
                detalleStr = `Hora retiro: ${depTimeStr || '—'}`;
            } else if (isAbsent) {
                detalleStr = "Jornada completa";
            } else if (isPresent) {
                detalleStr = "Asistencia puntual";
            }

            const row = worksheet.addRow([
                formattedDate,
                novedadLabel,
                detalleStr,
                rec.justification?.trim() || "Sin justificación registrada",
                rec.justificationUrl ? "Ver soporte digital" : "Sin soporte"
            ]);

            row.height = 22;

            // Zebra striping for non-status cells
            const rowBg = idx % 2 === 0 ? COLORS.white : COLORS.zebra;

            // Cell 1: Date
            const cellDate = row.getCell(1);
            cellDate.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: COLORS.primary } };
            cellDate.alignment = { vertical: 'middle', horizontal: 'center' };
            cellDate.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
            cellDate.border = thinBorder;

            // Cell 2: Status with color badge
            const cellStatus = row.getCell(2);
            cellStatus.font = { name: 'Calibri', size: 9, bold: true, color: { argb: statusFg } };
            cellStatus.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusBg } };
            cellStatus.alignment = { vertical: 'middle', horizontal: 'center' };
            cellStatus.border = thinBorder;

            // Cell 3: Detalle
            const cellDetalle = row.getCell(3);
            cellDetalle.font = { name: 'Calibri', size: 9, color: { argb: COLORS.primary } };
            cellDetalle.alignment = { vertical: 'middle', horizontal: 'left' };
            cellDetalle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
            cellDetalle.border = thinBorder;

            // Cell 4: Justification
            const cellJust = row.getCell(4);
            cellJust.font = { name: 'Calibri', size: 9, italic: !rec.justification, color: { argb: COLORS.subHeader } };
            cellJust.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
            cellJust.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
            cellJust.border = thinBorder;

            // Cell 5: Soporte link
            const cellLink = row.getCell(5);
            if (rec.justificationUrl) {
                cellLink.value = {
                    text: 'Ver soporte adjunto ↗',
                    hyperlink: rec.justificationUrl,
                    tooltip: 'Abrir documento de justificación'
                };
                cellLink.font = { name: 'Calibri', size: 9, bold: true, color: { argb: COLORS.accent }, underline: true };
            } else {
                cellLink.font = { name: 'Calibri', size: 8.5, italic: true, color: { argb: 'FF94A3B8' } };
            }
            cellLink.alignment = { vertical: 'middle', horizontal: 'center' };
            cellLink.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
            cellLink.border = thinBorder;
        });

        // AutoFilter on the table header
        worksheet.autoFilter = {
            from: { row: 13, column: 1 },
            to: { row: worksheet.rowCount, column: 5 }
        };
    }

    // 6. INSTITUTIONAL SIGNATURES & DISCLAIMER
    worksheet.addRow([]); // Blank line
    worksheet.addRow([]); // Blank line

    const signHeaderRow = worksheet.addRow(['', '______________________________________', '', '______________________________________', '']);
    signHeaderRow.height = 20;
    signHeaderRow.alignment = { horizontal: 'center', vertical: 'bottom' };
    signHeaderRow.font = { color: { argb: COLORS.borderDark }, bold: true };

    const signNamesRow = worksheet.addRow(['', teacherName, '', 'Coordinación Académica', '']);
    signNamesRow.height = 18;
    signNamesRow.alignment = { horizontal: 'center', vertical: 'middle' };
    signNamesRow.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: COLORS.primary } };

    const signRolesRow = worksheet.addRow(['', 'Docente Titular', '', 'Dirección / Decanatura', '']);
    signRolesRow.height = 16;
    signRolesRow.alignment = { horizontal: 'center', vertical: 'top' };
    signRolesRow.font = { name: 'Calibri', size: 8.5, italic: true, color: { argb: COLORS.subHeader } };

    worksheet.addRow([]);

    const disclaimerRow = worksheet.addRow(['SmartClass Academic Suite • Documento oficial generado automáticamente con validez institucional.']);
    worksheet.mergeCells(`A${disclaimerRow.number}:E${disclaimerRow.number}`);
    disclaimerRow.height = 20;
    disclaimerRow.font = { name: 'Calibri', size: 8, italic: true, color: { argb: 'FF94A3B8' } };
    disclaimerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Export buffer & trigger download
    const buffer = await workbook.xlsx.writeBuffer();
    const safeName = studentFullName.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_ ]/g, '').trim().replace(/\s+/g, '_');
    downloadWorkbookBuffer(buffer, `Reporte_Asistencia_${safeName || 'Estudiante'}`);
}

/**
 * 2. Export Course Consolidated Attendance History to Multi-Sheet Corporate Excel
 */
export async function exportCourseAttendanceToExcel({
    courseTitle,
    teacherName = "Docente Titular",
    students = [],
    allStudentStats = {},
    records = [],
    classDates = [],
    filterApplied = "Todos los estudiantes",
}: {
    courseTitle: string;
    teacherName?: string;
    students: StudentExcelInfo[];
    allStudentStats: Record<string, { absences: number; late: number; leaveEarly: number }>;
    records: AttendanceRecordExcel[];
    classDates?: string[];
    filterApplied?: string;
}) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SmartClass Academic Suite';
    workbook.created = new Date();

    // ==========================================
    // SHEET 1: RESUMEN GENERAL CONSOLIDADO
    // ==========================================
    const wsSummary = workbook.addWorksheet('Resumen Consolidado');
    wsSummary.views = [{ showGridLines: true }];

    // Column widths for summary
    wsSummary.columns = [
        { key: 'A', width: 6 },   // No.
        { key: 'B', width: 18 },  // Identificación
        { key: 'C', width: 34 },  // Estudiante
        { key: 'D', width: 28 },  // Correo
        { key: 'E', width: 14 },  // Total Clases
        { key: 'F', width: 14 },  // Presentes
        { key: 'G', width: 14 },  // Inasistencias
        { key: 'H', width: 14 },  // Tardes
        { key: 'I', width: 14 },  // Retiros
        { key: 'J', width: 16 },  // % Asistencia
        { key: 'K', width: 18 },  // Estado
    ];

    // Banner
    const bannerRow = wsSummary.addRow(['SMARTCLASS ACADEMIC SUITE • REPORTE CORPORATIVO DE ASISTENCIA GENERAL']);
    wsSummary.mergeCells('A1:K1');
    bannerRow.height = 36;
    bannerRow.font = { name: 'Calibri', size: 13, bold: true, color: { argb: COLORS.white } };
    bannerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primary } };
    bannerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    const subBannerRow = wsSummary.addRow([`Historial General del Curso — ${courseTitle}`]);
    wsSummary.mergeCells('A2:K2');
    subBannerRow.height = 22;
    subBannerRow.font = { name: 'Calibri', size: 10, bold: true, italic: true, color: { argb: COLORS.white } };
    subBannerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.secondary } };
    subBannerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    wsSummary.addRow([]); // Blank line

    // Metadata Bar
    const metaBar = wsSummary.addRow([
        'Docente:', teacherName, 
        '', 'Emisión:', format(new Date(), 'dd/MM/yyyy HH:mm'),
        '', 'Filtro Aplicado:', filterApplied,
        '', ''
    ]);
    wsSummary.mergeCells('B4:C4');
    wsSummary.mergeCells('E4:F4');
    wsSummary.mergeCells('H4:K4');
    metaBar.height = 20;
    metaBar.getCell('A').font = { bold: true, size: 9, color: { argb: COLORS.subHeader } };
    metaBar.getCell('B').font = { bold: true, size: 9, color: { argb: COLORS.primary } };
    metaBar.getCell('D').font = { bold: true, size: 9, color: { argb: COLORS.subHeader } };
    metaBar.getCell('E').font = { size: 9, color: { argb: COLORS.primary } };
    metaBar.getCell('G').font = { bold: true, size: 9, color: { argb: COLORS.subHeader } };
    metaBar.getCell('H').font = { size: 9, bold: true, color: { argb: COLORS.accent } };
    metaBar.eachCell({ includeEmpty: true }, cell => { cell.border = thinBorder; });

    wsSummary.addRow([]); // Blank line

    // Calculate course-wide metrics
    const totalStudents = students.length;
    let totalAbsences = 0;
    let totalLate = 0;
    let totalLeaveEarly = 0;
    let sumPercentage = 0;

    const totalSessions = classDates.length > 0 ? classDates.length : 1;

    students.forEach(st => {
        const stats = allStudentStats[st.id] || { absences: 0, late: 0, leaveEarly: 0 };
        totalAbsences += stats.absences;
        totalLate += stats.late;
        totalLeaveEarly += stats.leaveEarly;
        const attended = Math.max(0, totalSessions - stats.absences);
        const pct = Math.round((attended / totalSessions) * 100);
        sumPercentage += pct;
    });

    const avgAttendance = totalStudents > 0 ? Math.round(sumPercentage / totalStudents) : 100;

    // Course KPI Row
    const kpiLabelsRow = wsSummary.addRow(['', 'ESTUDIANTES', 'PROMEDIO ASISTENCIA', 'TOTAL FALTAS', 'TOTAL TARDES', 'TOTAL RETIROS']);
    wsSummary.mergeCells('B6:C6');
    kpiLabelsRow.height = 18;
    ['B', 'D', 'E', 'F'].forEach(c => {
        const cell = kpiLabelsRow.getCell(c);
        cell.font = { name: 'Calibri', size: 8.5, bold: true, color: { argb: COLORS.white } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.darkHeader } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = thinBorder;
    });

    const kpiValuesRow = wsSummary.addRow(['', totalStudents, `${avgAttendance}%`, totalAbsences, totalLate, totalLeaveEarly]);
    wsSummary.mergeCells('B7:C7');
    kpiValuesRow.height = 28;

    const valB = kpiValuesRow.getCell('B');
    valB.font = { size: 13, bold: true, color: { argb: COLORS.primary } };
    valB.alignment = { vertical: 'middle', horizontal: 'center' };
    valB.border = thinBorder;

    const valD = kpiValuesRow.getCell('D');
    valD.font = { size: 13, bold: true, color: { argb: avgAttendance >= 80 ? COLORS.presenteText : COLORS.faltaText } };
    valD.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: avgAttendance >= 80 ? COLORS.presenteBg : COLORS.faltaBg } };
    valD.alignment = { vertical: 'middle', horizontal: 'center' };
    valD.border = thinBorder;

    const valE = kpiValuesRow.getCell('E');
    valE.font = { size: 13, bold: true, color: { argb: COLORS.faltaText } };
    valE.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.faltaBg } };
    valE.alignment = { vertical: 'middle', horizontal: 'center' };
    valE.border = thinBorder;

    const valF = kpiValuesRow.getCell('F');
    valF.font = { size: 13, bold: true, color: { argb: COLORS.tardeText } };
    valF.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.tardeBg } };
    valF.alignment = { vertical: 'middle', horizontal: 'center' };
    valF.border = thinBorder;

    wsSummary.addRow([]); // Blank line

    // Roster Header (Row 9)
    const rosterHeader = wsSummary.addRow([
        'No.', 'IDENTIFICACIÓN', 'APELLIDOS Y NOMBRES', 'CORREO ELECTRÓNICO', 
        'SESIONES', 'PRESENTES', 'FALTAS', 'TARDES', 'RETIROS', '% ASISTENCIA', 'ESTADO'
    ]);
    rosterHeader.height = 24;
    rosterHeader.eachCell(cell => {
        cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: COLORS.white } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primary } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = thinBorder;
    });

    // Roster Rows
    students.forEach((student, index) => {
        const stats = allStudentStats[student.id] || { absences: 0, late: 0, leaveEarly: 0 };
        const attended = Math.max(0, totalSessions - stats.absences);
        const pct = Math.round((attended / totalSessions) * 100);

        let statusText = "NORMAL";
        let statusBg = COLORS.presenteBg;
        let statusFg = COLORS.presenteText;

        if (pct < 70) {
            statusText = "CRÍTICO (<70%)";
            statusBg = COLORS.faltaBg;
            statusFg = COLORS.faltaText;
        } else if (pct < 80) {
            statusText = "EN RIESGO (<80%)";
            statusBg = COLORS.tardeBg;
            statusFg = COLORS.tardeText;
        }

        const fullName = getStudentName(student);
        const rowBg = index % 2 === 0 ? COLORS.white : COLORS.zebra;

        const row = wsSummary.addRow([
            index + 1,
            student.profile?.identificacion || student.id.substring(0, 10),
            fullName,
            student.email,
            totalSessions,
            attended,
            stats.absences,
            stats.late,
            stats.leaveEarly,
            `${pct}%`,
            statusText
        ]);

        row.height = 22;

        row.eachCell((cell, colNumber) => {
            cell.border = thinBorder;
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };

            if (colNumber === 1 || colNumber === 2 || colNumber === 5 || colNumber === 6) {
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.font = { name: 'Calibri', size: 9 };
            } else if (colNumber === 3) {
                cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
                cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: COLORS.primary } };
            } else if (colNumber === 4) {
                cell.alignment = { vertical: 'middle', horizontal: 'left' };
                cell.font = { name: 'Calibri', size: 9, color: { argb: COLORS.subHeader } };
            } else if (colNumber === 7) { // Faltas
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.font = { name: 'Calibri', size: 9.5, bold: stats.absences > 0, color: { argb: stats.absences > 0 ? COLORS.faltaText : COLORS.subHeader } };
                if (stats.absences > 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.faltaBg } };
            } else if (colNumber === 8) { // Tardes
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.font = { name: 'Calibri', size: 9.5, bold: stats.late > 0, color: { argb: stats.late > 0 ? COLORS.tardeText : COLORS.subHeader } };
                if (stats.late > 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.tardeBg } };
            } else if (colNumber === 9) { // Retiros
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.font = { name: 'Calibri', size: 9.5, bold: stats.leaveEarly > 0, color: { argb: stats.leaveEarly > 0 ? COLORS.retiroText : COLORS.subHeader } };
                if (stats.leaveEarly > 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.retiroBg } };
            } else if (colNumber === 10) { // % Asistencia
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: statusFg } };
            } else if (colNumber === 11) { // Estado
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.font = { name: 'Calibri', size: 8.5, bold: true, color: { argb: statusFg } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusBg } };
            }
        });
    });

    // AutoFilter on summary roster
    wsSummary.autoFilter = {
        from: { row: 9, column: 1 },
        to: { row: wsSummary.rowCount, column: 11 }
    };

    // ==========================================
    // SHEET 2: DETALLE DE NOVEDADES
    // ==========================================
    const wsDetails = workbook.addWorksheet('Detalle de Novedades');
    wsDetails.views = [{ showGridLines: true }];

    wsDetails.columns = [
        { key: 'A', width: 14 },  // Fecha
        { key: 'B', width: 18 },  // Identificación
        { key: 'C', width: 32 },  // Estudiante
        { key: 'D', width: 18 },  // Novedad
        { key: 'E', width: 26 },  // Detalle / Horario
        { key: 'F', width: 36 },  // Justificación
        { key: 'G', width: 24 },  // Enlace Soporte
    ];

    // Banner Details
    const detailBanner = wsDetails.addRow(['SMARTCLASS • BITÁCORA DETALLADA DE NOVEDADES DE ASISTENCIA']);
    wsDetails.mergeCells('A1:G1');
    detailBanner.height = 32;
    detailBanner.font = { name: 'Calibri', size: 12, bold: true, color: { argb: COLORS.white } };
    detailBanner.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primary } };
    detailBanner.alignment = { vertical: 'middle', horizontal: 'center' };

    wsDetails.addRow([]); // Blank line

    // Details Header (Row 3)
    const detailHeader = wsDetails.addRow([
        'FECHA', 'IDENTIFICACIÓN', 'ESTUDIANTE', 'NOVEDAD', 'DETALLE / HORARIO', 'JUSTIFICACIÓN', 'SOPORTE ADJUNTO'
    ]);
    detailHeader.height = 24;
    detailHeader.eachCell(cell => {
        cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: COLORS.white } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.secondary } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = thinBorder;
    });

    // Filter relevant records for the students in this report
    const studentMap = new Map(students.map(s => [s.id, s]));
    const noveltyRecords = records.filter(r => {
        if (!r.userId || !studentMap.has(r.userId)) return false;
        return r.status !== "PRESENT" || Boolean(r.arrivalTime) || Boolean(r.departureTime);
    });

    // Sort chronologically descending
    noveltyRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (noveltyRecords.length === 0) {
        const emptyRow = wsDetails.addRow(['No se encontraron novedades de asistencia registradas para los estudiantes seleccionados.', '', '', '', '', '', '']);
        wsDetails.mergeCells(`A${emptyRow.number}:G${emptyRow.number}`);
        emptyRow.height = 26;
        emptyRow.font = { italic: true, color: { argb: COLORS.subHeader } };
        emptyRow.alignment = { vertical: 'middle', horizontal: 'center' };
        emptyRow.getCell(1).border = thinBorder;
    } else {
        noveltyRecords.forEach((rec, idx) => {
            const student = studentMap.get(rec.userId!)!;
            const isLate = Boolean(rec.arrivalTime) || rec.status === "LATE";
            const isLeaveEarly = Boolean(rec.departureTime) || rec.status === "LEAVE_EARLY";
            const isBoth = isLate && isLeaveEarly;
            const isAbsent = rec.status === "ABSENT";
            const isExcused = rec.status === "EXCUSED";

            let novedadLabel = "PRESENTE";
            let statusBg = COLORS.presenteBg;
            let statusFg = COLORS.presenteText;

            if (isAbsent) {
                novedadLabel = "FALTA";
                statusBg = COLORS.faltaBg;
                statusFg = COLORS.faltaText;
            } else if (isBoth) {
                novedadLabel = "TARDE + RETIRO";
                statusBg = COLORS.tardeRetiroBg;
                statusFg = COLORS.tardeRetiroText;
            } else if (isLate) {
                novedadLabel = "TARDE";
                statusBg = COLORS.tardeBg;
                statusFg = COLORS.tardeText;
            } else if (isLeaveEarly) {
                novedadLabel = "RETIRO";
                statusBg = COLORS.retiroBg;
                statusFg = COLORS.retiroText;
            } else if (isExcused) {
                novedadLabel = "EXCUSADO";
                statusBg = COLORS.excusadoBg;
                statusFg = COLORS.excusadoText;
            }

            const formattedDate = formatCalendarDate(toUTCStartOfDayFromRegional(rec.date), "dd/MM/yyyy");
            const arrTimeStr = rec.arrivalTime ? formatTimeRegional(rec.arrivalTime) : null;
            const depTimeStr = rec.departureTime ? formatTimeRegional(rec.departureTime) : null;

            let detalleStr = "—";
            if (isBoth) {
                detalleStr = `Llegada: ${arrTimeStr || '—'} | Salida: ${depTimeStr || '—'}`;
            } else if (isLate) {
                detalleStr = `Hora llegada: ${arrTimeStr || '—'}`;
            } else if (isLeaveEarly) {
                detalleStr = `Hora retiro: ${depTimeStr || '—'}`;
            } else if (isAbsent) {
                detalleStr = "Jornada completa";
            }

            const rowBg = idx % 2 === 0 ? COLORS.white : COLORS.zebra;
            const row = wsDetails.addRow([
                formattedDate,
                student.profile?.identificacion || student.id.substring(0, 10),
                getStudentName(student),
                novedadLabel,
                detalleStr,
                rec.justification?.trim() || "Sin justificación",
                rec.justificationUrl ? "Ver soporte digital" : "Sin soporte"
            ]);

            row.height = 22;

            row.eachCell((cell, colNumber) => {
                cell.border = thinBorder;
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };

                if (colNumber === 1 || colNumber === 2) {
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                    cell.font = { name: 'Calibri', size: 9 };
                } else if (colNumber === 3) {
                    cell.alignment = { vertical: 'middle', horizontal: 'left' };
                    cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: COLORS.primary } };
                } else if (colNumber === 4) {
                    cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: statusFg } };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusBg } };
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                } else if (colNumber === 5) {
                    cell.alignment = { vertical: 'middle', horizontal: 'left' };
                    cell.font = { name: 'Calibri', size: 9 };
                } else if (colNumber === 6) {
                    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
                    cell.font = { name: 'Calibri', size: 9, italic: !rec.justification, color: { argb: COLORS.subHeader } };
                } else if (colNumber === 7) {
                    if (rec.justificationUrl) {
                        cell.value = {
                            text: 'Ver soporte adjunto ↗',
                            hyperlink: rec.justificationUrl,
                            tooltip: 'Abrir documento de justificación'
                        };
                        cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: COLORS.accent }, underline: true };
                    } else {
                        cell.font = { name: 'Calibri', size: 8.5, italic: true, color: { argb: 'FF94A3B8' } };
                    }
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                }
            });
        });

        // AutoFilter on details sheet
        wsDetails.autoFilter = {
            from: { row: 3, column: 1 },
            to: { row: wsDetails.rowCount, column: 7 }
        };
    }

    // Export buffer & trigger download
    const buffer = await workbook.xlsx.writeBuffer();
    const safeCourse = courseTitle.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_ ]/g, '').trim().replace(/\s+/g, '_');
    downloadWorkbookBuffer(buffer, `Historial_Asistencias_${safeCourse || 'Curso'}_${format(new Date(), 'yyyyMMdd')}`);
}
