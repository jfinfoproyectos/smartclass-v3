import ExcelJS from 'exceljs';
import { getActivityChecklistConfig, extractEvaluationMetadata, stripEvaluationMetadata } from '@/features/teacher/utils/checklistGradingUtils';
import { formatEvidenceUrl, formatName } from '@/lib/utils';

/**
 * Export data to Excel file with styling
 */
export async function exportToExcel(data: any[], filename: string, sheetName: string = 'Datos') {
    if (!data || data.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SmartClass Academic Suite';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(sheetName);
    setupWorksheetComp(worksheet, data, sheetName);

    // Buffer and Download
    const buffer = await workbook.xlsx.writeBuffer();
    triggerDownload(buffer, filename);
}

/**
 * Export multiple sheets to Excel with styling
 */
export async function exportMultiSheetExcel(sheets: { name: string; data: any[] }[], filename: string) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SmartClass Academic Suite';
    workbook.created = new Date();

    sheets.forEach(sheetData => {
        if (sheetData.data.length > 0) {
            const worksheet = workbook.addWorksheet(sheetData.name);
            setupWorksheetComp(worksheet, sheetData.data, sheetData.name);
        }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    triggerDownload(buffer, filename);
}

/**
 * Export hierarchical grades to Excel with multi-level headers
 */
export async function exportHierarchicalGradesToExcel(data: any[], filename: string, sheetName: string = 'Notas') {
    if (data.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SmartClass Academic Suite';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet(sheetName);

    // 1. Prepare Columns and Hierarchical Headers
    const baseHeaders = ['ID', 'Estudiante', 'Correo'];
    const hierarchy = data[0]._hierarchy || [];
    
    // Row 4: Categories
    // Row 5: Groups / Totals
    const headerRow1: string[] = [...baseHeaders];
    const headerRow2: string[] = ['', '', ''];

    hierarchy.forEach((cat: any) => {
        headerRow1.push(`${cat.name} (${cat.weight}%)`);
        headerRow2.push('PROMEDIO CORTE');

        cat.groups.forEach((group: any) => {
            headerRow1.push(''); // Will be merged later
            headerRow2.push(`${group.name} (${group.weight}%)`);
        });
    });

    headerRow1.push('NOTA FINAL');
    headerRow2.push('');

    const totalCols = headerRow1.length;

    // BANNER INSTITUCIONAL CORPORATIVO (Row 1 & 2)
    const titleRow = worksheet.addRow(['SMARTCLASS ACADEMIC SUITE • CONSOLIDADO OFICIAL DE CALIFICACIONES']);
    worksheet.mergeCells(1, 1, 1, totalCols);
    titleRow.height = 34;
    titleRow.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
    titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    titleRow.alignment = { vertical: 'middle', horizontal: 'center' };

    const subTitleRow = worksheet.addRow([`Reporte Jerárquico de Calificaciones por Categorías y Cortes — Emisión: ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES')}`]);
    worksheet.mergeCells(2, 1, 2, totalCols);
    subTitleRow.height = 20;
    subTitleRow.font = { name: 'Calibri', size: 9.5, bold: true, italic: true, color: { argb: 'FFFFFFFF' } };
    subTitleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    subTitleRow.alignment = { vertical: 'middle', horizontal: 'center' };

    const blankRow = worksheet.addRow([]); // Row 3: Blank spacing
    blankRow.height = 8;

    // Headers at Rows 4 and 5
    worksheet.addRow(headerRow1);
    worksheet.addRow(headerRow2);

    // 2. Add Data Rows (Row 6+)
    data.forEach(student => {
        const rowData: any[] = [student['ID'], student['Estudiante'], student['Correo']];
        
        hierarchy.forEach((cat: any) => {
            const studentCat = student._hierarchy.find((c: any) => c.id === cat.id);
            rowData.push(studentCat ? studentCat.grade.toFixed(2) : '0.00');

            cat.groups.forEach((group: any) => {
                const studentGroup = studentCat?.groups.find((g: any) => g.id === group.id);
                rowData.push(studentGroup ? studentGroup.grade.toFixed(2) : '0.00');
            });
        });

        rowData.push(student['Nota Final']);
        worksheet.addRow(rowData);
    });

    // 3. Styling and Merging
    let currentCol = baseHeaders.length + 1;
    hierarchy.forEach((cat: any) => {
        const groupCount = cat.groups.length;
        const endCol = currentCol + groupCount;
        if (groupCount > 0) {
            worksheet.mergeCells(4, currentCol, 4, endCol);
        }
        currentCol = endCol + 1;
    });

    // Merge Base headers and Nota Final vertically across Rows 4 and 5
    [1, 2, 3, currentCol].forEach(colIndex => {
        worksheet.mergeCells(4, colIndex, 5, colIndex);
    });

    // Style both header rows (Rows 4 & 5)
    [4, 5].forEach(rowNum => {
        const row = worksheet.getRow(rowNum);
        row.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' }, size: 9.5 };
        row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: rowNum === 4 ? 'FF0F172A' : 'FF1E3A5F' }
        };
        row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    });

    worksheet.getRow(4).height = 32;
    worksheet.getRow(5).height = 28;

    // Set column widths
    worksheet.columns.forEach((col, i) => {
        if (i < 3) col.width = i === 1 ? 34 : 16;
        else col.width = 14;
    });

    // Style data cells (Row 6+)
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber <= 5) return;
        
        const rowBg = rowNumber % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';
        row.height = 22;

        row.eachCell((cell, colNumber) => {
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
            };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
            cell.font = { name: 'Calibri', size: 9.5 };

            if (colNumber === 1) {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            } else if (colNumber === 2) {
                cell.alignment = { horizontal: 'left', vertical: 'middle' };
                cell.font = { name: 'Calibri', size: 9.5, bold: true };
            } else if (colNumber === 3) {
                cell.alignment = { horizontal: 'left', vertical: 'middle' };
            } else {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                const val = parseFloat(cell.value?.toString() || '');
                if (!isNaN(val)) {
                    if (val < 3.0) {
                        cell.font = { name: 'Calibri', size: 9.5, color: { argb: 'FFDC2626' }, bold: true };
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE4E6' } };
                    } else if (val >= 4.5) {
                        cell.font = { name: 'Calibri', size: 9.5, color: { argb: 'FF15803D' }, bold: true };
                    }
                }
            }
        });
    });

    // Last Column (Nota Final) Bold
    const lastColIndex = baseHeaders.length + hierarchy.reduce((acc: number, cat: any) => acc + cat.groups.length + 1, 0) + 1;
    worksheet.getColumn(lastColIndex).eachCell((cell, rowNum) => {
        if (rowNum > 5) {
            cell.font = { ...cell.font, bold: true, size: 10.5 };
        }
    });

    // Freeze panes on row 5 and auto-filter
    worksheet.views = [{ state: 'frozen', ySplit: 5 }];
    worksheet.autoFilter = {
        from: { row: 5, column: 1 },
        to: { row: worksheet.rowCount, column: totalCols }
    };

    // Buffer and Download
    const buffer = await workbook.xlsx.writeBuffer();
    triggerDownload(buffer, filename);
}

/**
 * Helper to parse markdown feedback tables and text blocks for Excel export
 */
export function parseFeedbackContent(feedbackRaw: string) {
    if (!feedbackRaw || typeof feedbackRaw !== 'string') {
        return { tableRows: [], cleanLines: [] };
    }

    const feedback = feedbackRaw.replace(/\\n/g, '\n');
    const lines = feedback.split('\n');
    const tableRows: Array<{ file: string; grade: string; status: string }> = [];
    const cleanLines: string[] = [];

    let inTable = false;

    for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.startsWith('|')) {
            const cells = trimmed.split('|').map(c => c.trim()).filter(Boolean);

            // Skip separator line | --- | --- | --- |
            if (cells.some(c => /^:?-+:?$/.test(c))) {
                inTable = true;
                continue;
            }

            // Skip table header row
            if (cells[0]?.toLowerCase().includes('archivo') && cells[1]?.toLowerCase().includes('nota')) {
                inTable = true;
                continue;
            }

            if (cells.length >= 2) {
                const file = cells[0].replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*`#]/g, '');
                const grade = cells[1].replace(/[*`#]/g, '');
                const status = cells[2] ? cells[2].replace(/[*`#]/g, '') : 'Evaluado';
                tableRows.push({ file, grade, status });
                inTable = true;
                continue;
            }
        } else {
            inTable = false;
        }

        if (trimmed) {
            cleanLines.push(trimmed.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*`#]/g, ''));
        }
    }

    return {
        tableRows,
        cleanLines
    };
}

/**
 * Export full Activity Results & Feedback for all students using ExcelJS
 */
export async function exportActivityResultsToExcel(
    activity: any,
    studentStatusList: Array<{ student: any; submission: any; status: string; isRejected?: boolean }>,
    filename?: string
) {
    const workbook = new ExcelJS.Workbook();
    
    // ── SHEET 1: RESUMEN GENERAL ──────────────────────────────────────────────
    const worksheet = workbook.addWorksheet('Resumen de Calificaciones');

    // Title & Info section
    worksheet.addRow(['REPORTE DE ACTIVIDAD Y RETROALIMENTACIÓN']);
    worksheet.addRow(['Actividad:', activity.title]);
    worksheet.addRow(['Tipo:', activity.type || 'MANUAL', 'Peso:', `${activity.weight || 0}%`]);
    if (activity.deadline) {
        worksheet.addRow(['Fecha Límite:', new Date(activity.deadline).toLocaleString('es-ES')]);
    }
    worksheet.addRow([]); // empty spacing

    // Style Title Banner
    const titleRow = worksheet.getRow(1);
    titleRow.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
    worksheet.mergeCells('A1:H1');
    titleRow.height = 30;
    titleRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Header Row for Table
    const headers = [
        'Estudiante',
        'Correo Electrónico',
        'Estado',
        'Fecha de Entrega',
        'Intentos',
        'Calificación (/5.0)',
        'Enlace / Repositorio',
        'Retroalimentación'
    ];

    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;

    // Data rows
    studentStatusList.forEach(({ student, submission, status, isRejected }) => {
        let statusText = 'Pendiente';
        if (status === 'graded') statusText = 'Calificado';
        else if (isRejected) statusText = 'Rechazado';
        else if (status === 'submitted') statusText = 'Por Calificar';

        const gradeVal = submission?.grade !== null && submission?.grade !== undefined 
            ? Number(submission.grade).toFixed(1) 
            : (!submission && activity.deadline && new Date(activity.deadline) < new Date() && activity.type !== 'MANUAL' ? '0.0' : '-');

        const submittedAtText = submission ? formatDateForExport(submission.lastSubmittedAt || submission.createdAt) : '-';
        const attemptsText = submission ? `${submission.attemptCount} / ${activity.maxAttempts || 1}` : '-';
        const linkText = submission?.url || '-';
        const feedbackText = submission?.feedback 
            ? submission.feedback.replace(/\\n/g, '\n').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*`#]/g, '')
            : (status === 'pending' ? 'Sin entrega' : 'Sin retroalimentación');

        const studentDisplayName = student.name || `${student.profile?.nombres || ''} ${student.profile?.apellido || ''}`.trim() || 'Estudiante';

        const row = worksheet.addRow([
            studentDisplayName,
            student.email || '',
            statusText,
            submittedAtText,
            attemptsText,
            gradeVal,
            linkText,
            feedbackText
        ]);

        row.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
    });

    // Set Column Widths
    worksheet.getColumn(1).width = 25; // Estudiante
    worksheet.getColumn(2).width = 30; // Correo
    worksheet.getColumn(3).width = 15; // Estado
    worksheet.getColumn(4).width = 18; // Fecha
    worksheet.getColumn(5).width = 12; // Intentos
    worksheet.getColumn(6).width = 18; // Calificacion
    worksheet.getColumn(7).width = 35; // Link
    worksheet.getColumn(8).width = 65; // Retroalimentacion

    // Style data cells borders & grade colors
    const startRow = 6;
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber < startRow) return;

        row.eachCell((cell, colNumber) => {
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
            };

            // Grade cell formatting
            if (colNumber === 6) {
                cell.alignment = { horizontal: 'center', vertical: 'top' };
                const num = parseFloat(cell.value?.toString() || '');
                if (!isNaN(num)) {
                    if (num < 3.0) {
                        cell.font = { color: { argb: 'FFEF4444' }, bold: true };
                    } else if (num >= 4.5) {
                        cell.font = { color: { argb: 'FF15803D' }, bold: true };
                    }
                }
            }
        });
    });

    // ── SHEET 2: DESGLOSE POR ARCHIVO ─────────────────────────────────────────
    const allFileDetails: Array<{ student: string; email: string; file: string; grade: string; status: string }> = [];

    studentStatusList.forEach(({ student, submission }) => {
        if (submission?.feedback) {
            const { tableRows } = parseFeedbackContent(submission.feedback);
            const studentDisplayName = student.name || `${student.profile?.nombres || ''} ${student.profile?.apellido || ''}`.trim() || 'Estudiante';
            tableRows.forEach(tr => {
                allFileDetails.push({
                    student: studentDisplayName,
                    email: student.email || '',
                    file: tr.file,
                    grade: tr.grade,
                    status: tr.status
                });
            });
        }
    });

    if (allFileDetails.length > 0) {
        const fileSheet = workbook.addWorksheet('Desglose de Archivos');
        const fileHeader = fileSheet.addRow(['Estudiante', 'Correo', 'Archivo Evaluado', 'Nota /5.0', 'Estado']);
        fileHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        fileHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
        fileHeader.height = 25;

        allFileDetails.forEach(item => {
            fileSheet.addRow([item.student, item.email, item.file, item.grade, item.status]);
        });

        fileSheet.getColumn(1).width = 25;
        fileSheet.getColumn(2).width = 30;
        fileSheet.getColumn(3).width = 35;
        fileSheet.getColumn(4).width = 15;
        fileSheet.getColumn(5).width = 20;

        fileSheet.eachRow((row, rIdx) => {
            if (rIdx === 1) return;
            row.eachCell((cell, cIdx) => {
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                };
                if (cIdx === 4) cell.alignment = { horizontal: 'center' };
            });
        });
    }

    const safeFilename = filename || `${activity.title.replace(/\s+/g, '_')}_Resultados_Retroalimentacion`;
    const buffer = await workbook.xlsx.writeBuffer();
    triggerDownload(buffer, safeFilename);
}

/**
 * Export single submission feedback & result using ExcelJS
 */
export async function exportSingleSubmissionToExcel(
    activity: any,
    submission: any,
    studentName: string,
    studentEmail?: string,
    filename?: string
) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Retroalimentación');

    // Title Banner
    const titleRow = worksheet.addRow(['INFORME DE ENTREGAS Y RETROALIMENTACIÓN']);
    titleRow.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    worksheet.mergeCells('A1:C1');
    titleRow.height = 30;
    titleRow.alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.addRow([]); // spacing

    // Section Header Helper
    const addSectionHeader = (title: string) => {
        const row = worksheet.addRow([title]);
        row.font = { bold: true, color: { argb: 'FF1E40AF' }, size: 11 };
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
        worksheet.mergeCells(`A${row.number}:C${row.number}`);
        row.height = 22;
        row.alignment = { vertical: 'middle' };
    };

    // 1. Información del Estudiante y Actividad
    addSectionHeader('Información de la Actividad y Estudiante');
    worksheet.addRow(['Actividad:', activity.title || '-']);
    worksheet.addRow(['Curso:', activity.course?.title || activity.courseTitle || '-']);
    worksheet.addRow(['Estudiante:', studentName]);
    if (studentEmail) worksheet.addRow(['Correo:', studentEmail]);
    worksheet.addRow(['Fecha de Entrega:', submission?.lastSubmittedAt || submission?.createdAt ? formatDateForExport(submission.lastSubmittedAt || submission.createdAt) : '-']);
    worksheet.addRow(['Intentos:', `${submission?.attemptCount || 1} / ${activity.maxAttempts || 1}`]);
    worksheet.addRow(['URL / Repositorio:', submission?.url || '-']);
    
    const gradeStr = submission?.grade !== null && submission?.grade !== undefined ? `${submission.grade.toFixed(1)} / 5.0` : '-';
    const gradeRow = worksheet.addRow(['Calificación Obtenida:', gradeStr]);
    const gradeCell = gradeRow.getCell(2);
    gradeCell.font = { bold: true, size: 12, color: { argb: submission?.grade >= 3.0 ? 'FF15803D' : 'FFEF4444' } };

    worksheet.addRow([]); // spacing

    // Parse Checklist & Metadata
    const rawFeedback = submission?.feedback || '';
    const cleanFeedbackWithoutMeta = stripEvaluationMetadata(rawFeedback);
    const checklistConfig = getActivityChecklistConfig(activity?.description);
    const evalMetadata = extractEvaluationMetadata(rawFeedback);

    // Split AI feedback and Teacher observations
    let aiFeedbackText = cleanFeedbackWithoutMeta;
    let teacherObservationsText = "";

    const teacherMarker = "### 👨‍🏫 Observaciones del Profesor";
    const markerIdx = cleanFeedbackWithoutMeta.indexOf(teacherMarker);
    if (markerIdx !== -1) {
        aiFeedbackText = cleanFeedbackWithoutMeta.substring(0, markerIdx).trim();
        teacherObservationsText = cleanFeedbackWithoutMeta.substring(markerIdx + teacherMarker.length).trim();
    } else if (cleanFeedbackWithoutMeta.includes("Observaciones del Profesor")) {
        const parts = cleanFeedbackWithoutMeta.split(/Observaciones del Profesor/i);
        aiFeedbackText = parts[0].trim();
        teacherObservationsText = parts.slice(1).join("").trim();
    }

    // 2. Ponderación de Calificación (si aplica sustentación oral docente)
    if (checklistConfig) {
        addSectionHeader(`Ponderación de Calificación (${checklistConfig.aiWeight}% IA + ${checklistConfig.checklistWeight}% Sustentación Docente)`);
        worksheet.addRow([`Evaluación IA (${checklistConfig.aiWeight}%):`, evalMetadata?.aiGrade !== null && evalMetadata?.aiGrade !== undefined ? `${evalMetadata.aiGrade.toFixed(1)} / 5.0` : '-']);
        worksheet.addRow([`Sustentación Docente (${checklistConfig.checklistWeight}%):`, evalMetadata?.checklistScore !== null && evalMetadata?.checklistScore !== undefined ? `${evalMetadata.checklistScore.toFixed(1)} / 5.0` : '-']);
        worksheet.addRow(['Nota Final Consolidada:', `${submission?.grade !== null && submission?.grade !== undefined ? Number(submission.grade).toFixed(1) : '-'} / 5.0`]);
        worksheet.addRow([]); // spacing
    }

    // 3. Criterios de Sustentación Oral Calificados (si aplica)
    if (checklistConfig?.criteria && checklistConfig.criteria.length > 0) {
        addSectionHeader('Criterios de Sustentación Oral Calificados');
        const critHeader = worksheet.addRow(['# Criterio', 'Ponderación (%)', 'Nivel Calificado', 'Nota /5.0', 'Pregunta Evaluada']);
        critHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        critHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
        critHeader.alignment = { horizontal: 'center' };

        const getLevelLabel = (factor?: number) => {
            if (factor === 1.0) return 'Sabe (100%)';
            if (factor === 0.75) return 'Aceptable (75%)';
            if (factor === 0.5) return 'Parcial (50%)';
            if (factor === 0) return 'No Sabe (0%)';
            return '—';
        };

        checklistConfig.criteria.forEach((crit, idx) => {
            const factor = evalMetadata?.criteriaLevels?.[crit.id]
                ?? evalMetadata?.criteriaLevels?.[`crit-${idx + 1}`]
                ?? evalMetadata?.criteriaLevels?.[String(idx + 1)];
            const lvlLabel = typeof factor === 'number' ? getLevelLabel(factor) : '—';
            const gradeVal = typeof factor === 'number' ? (factor * 5.0).toFixed(1) : '—';

            const r = worksheet.addRow([
                `#${idx + 1} ${crit.name}`,
                `${crit.percentage}%`,
                lvlLabel,
                gradeVal,
                crit.question || '-'
            ]);
            r.getCell(2).alignment = { horizontal: 'center' };
            r.getCell(3).alignment = { horizontal: 'center' };
            r.getCell(4).alignment = { horizontal: 'center' };
            r.eachCell(cell => {
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                };
            });
        });

        worksheet.addRow([]); // spacing
    }

    // 4. Observaciones del Profesor
    if (teacherObservationsText) {
        addSectionHeader('Observaciones y Recomendaciones del Profesor');
        const obsRow = worksheet.addRow([teacherObservationsText]);
        worksheet.mergeCells(`A${obsRow.number}:E${obsRow.number}`);
        obsRow.alignment = { wrapText: true, vertical: 'top' };
        worksheet.addRow([]);
    }

    // 5. Tabla de Archivos Evaluados (Si aplica)
    const { tableRows, cleanLines } = parseFeedbackContent(aiFeedbackText);
    if (tableRows.length > 0) {
        addSectionHeader('Archivos / Entregables Evaluados');
        const tblHeader = worksheet.addRow(['Archivo', 'Nota /5.0', 'Estado']);
        tblHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        tblHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
        tblHeader.alignment = { horizontal: 'center' };

        tableRows.forEach(tr => {
            const r = worksheet.addRow([tr.file, tr.grade, tr.status]);
            r.getCell(2).alignment = { horizontal: 'center' };
            r.getCell(3).alignment = { horizontal: 'center' };
            r.eachCell(cell => {
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                };
            });
        });

        worksheet.addRow([]); // spacing
    }

    // 6. Retroalimentación Detallada de la IA
    addSectionHeader('Retroalimentación de la IA');
    if (cleanLines.length > 0) {
        cleanLines.forEach(line => {
            const lineRow = worksheet.addRow([line]);
            worksheet.mergeCells(`A${lineRow.number}:E${lineRow.number}`);
            lineRow.alignment = { wrapText: true, vertical: 'top' };
        });
    } else {
        const fbRow = worksheet.addRow([aiFeedbackText || 'Sin retroalimentación registrada.']);
        worksheet.mergeCells(`A${fbRow.number}:E${fbRow.number}`);
        fbRow.alignment = { wrapText: true, vertical: 'top' };
    }
    worksheet.addRow([]);

    // 7. Enunciado / Rúbrica
    if (activity.statement) {
        addSectionHeader('Enunciado / Rúbrica de Evaluación');
        const stmtText = activity.statement.replace(/\\n/g, '\n').replace(/[*`#]/g, '');
        const stmtRow = worksheet.addRow([stmtText]);
        worksheet.mergeCells(`A${stmtRow.number}:E${stmtRow.number}`);
        stmtRow.alignment = { wrapText: true, vertical: 'top' };
        worksheet.addRow([]);
    }

    worksheet.getColumn(1).width = 30;
    worksheet.getColumn(2).width = 18;
    worksheet.getColumn(3).width = 20;
    worksheet.getColumn(4).width = 14;
    worksheet.getColumn(5).width = 45;

    const safeFilename = filename || `Retroalimentacion_${studentName.replace(/\s+/g, '_')}_${(activity.title || 'Actividad').replace(/\s+/g, '_')}`;
    const buffer = await workbook.xlsx.writeBuffer();
    triggerDownload(buffer, safeFilename);
}

/**
 * Helper to setup worksheet columns and styles
 */
function setupWorksheetComp(worksheet: ExcelJS.Worksheet, data: any[], reportTitle?: string) {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const totalCols = headers.length;

    // 1. BANNER INSTITUCIONAL CORPORATIVO (Row 1)
    const titleRow = worksheet.addRow(['SMARTCLASS ACADEMIC SUITE • REPORTE OFICIAL']);
    worksheet.mergeCells(1, 1, 1, totalCols);
    titleRow.height = 34;
    titleRow.font = { name: 'Calibri', size: 12.5, bold: true, color: { argb: 'FFFFFFFF' } };
    titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    titleRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Subtitle / Date (Row 2)
    const displayTitle = reportTitle || worksheet.name || 'Datos';
    const subRow = worksheet.addRow([`Documento Institucional: ${displayTitle} — Emisión: ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES')}`]);
    worksheet.mergeCells(2, 1, 2, totalCols);
    subRow.height = 20;
    subRow.font = { name: 'Calibri', size: 9, bold: true, italic: true, color: { argb: 'FFFFFFFF' } };
    subRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    subRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Row 3: Blank spacing
    const blankRow = worksheet.addRow([]);
    blankRow.height = 8;

    // Row 4: Column Headers
    const headerRow = worksheet.addRow(headers);
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
    });

    // Compute column widths
    headers.forEach((header, i) => {
        let maxLen = header.length;
        for (const row of data) {
            const val = row[header];
            if (val !== null && val !== undefined) {
                const len = String(val).length;
                if (len > maxLen) maxLen = len;
            }
        }
        worksheet.getColumn(i + 1).width = Math.min(Math.max(maxLen + 4, 15), 55);
    });

    // Add data rows starting row 5
    data.forEach((item, idx) => {
        const rowVals = headers.map(h => item[h] ?? '');
        const dataRow = worksheet.addRow(rowVals);
        dataRow.height = 21;

        const rowBg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';

        dataRow.eachCell((cell, colNumber) => {
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
            };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
            cell.font = { name: 'Calibri', size: 9.5 };

            const columnKey = headers[colNumber - 1];
            const rawVal = cell.value?.toString()?.trim();

            if (columnKey === 'ID' || columnKey === 'No.' || columnKey === 'Fecha' || columnKey === 'Código') {
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
            } else {
                cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
            }

            const isPotentialLink = /url|link|enlace|evidencia|soporte|repositorio|entrega/i.test(columnKey) || 
                                   Boolean(rawVal && (rawVal.startsWith('http://') || rawVal.startsWith('https://') || rawVal.includes('github.com') || rawVal.includes('drive.google.com')));
            const evidenceUrl = isPotentialLink ? formatEvidenceUrl(rawVal) : null;

            if (evidenceUrl) {
                cell.value = { text: evidenceUrl, hyperlink: evidenceUrl };
                cell.font = { name: 'Calibri', size: 9.5, color: { argb: 'FF2563EB' }, underline: true };
                cell.alignment = { vertical: 'middle', horizontal: 'left' };
            } else if (rawVal) {
                if (rawVal === '0.0' || rawVal === '0,0' || rawVal === '0') {
                    cell.font = { name: 'Calibri', size: 9.5, color: { argb: 'FFDC2626' }, bold: true };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                } else if (/^[0-5][.,]\d+$/.test(rawVal) || /^[0-5]$/.test(rawVal)) {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    const numGrade = parseFloat(rawVal.replace(',', '.'));
                    if (numGrade < 3.0) {
                        cell.font = { name: 'Calibri', size: 9.5, color: { argb: 'FFDC2626' }, bold: true };
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE4E6' } };
                    } else if (numGrade >= 4.5) {
                        cell.font = { name: 'Calibri', size: 9.5, color: { argb: 'FF15803D' }, bold: true };
                    }
                } else if (rawVal === 'PRESENTE' || rawVal === 'Presente' || rawVal === 'P') {
                    cell.font = { name: 'Calibri', size: 9, color: { argb: 'FF065F46' }, bold: true };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                } else if (rawVal === 'AUSENTE' || rawVal === 'Ausente' || rawVal === 'FALTA' || rawVal === 'Falta' || rawVal === 'A') {
                    cell.font = { name: 'Calibri', size: 9, color: { argb: 'FF9F1239' }, bold: true };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE4E6' } };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                } else if (rawVal === 'TARDANZA' || rawVal === 'Tardanza' || rawVal === 'TARDE' || rawVal === 'Tarde' || rawVal === 'L') {
                    cell.font = { name: 'Calibri', size: 9, color: { argb: 'FF92400E' }, bold: true };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                } else if (rawVal === 'RETIRO' || rawVal === 'Retiro' || rawVal === 'R') {
                    cell.font = { name: 'Calibri', size: 9, color: { argb: 'FF3730A3' }, bold: true };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                } else if (rawVal === 'JUSTIFICADO' || rawVal === 'Justificado' || rawVal === 'EXCUSADO' || rawVal === 'E') {
                    cell.font = { name: 'Calibri', size: 9, color: { argb: 'FF0369A1' }, bold: true };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                }
            }

            if (columnKey === 'Nota Final' || columnKey === 'Promedio' || columnKey === 'Nota') {
                cell.font = { ...cell.font, bold: true };
            }
        });
    });

    // Freeze header row
    worksheet.views = [{ state: 'frozen', ySplit: 4 }];

    // Auto-filter on row 4
    worksheet.autoFilter = {
        from: { row: 4, column: 1 },
        to: { row: worksheet.rowCount, column: totalCols }
    };
}

/**
 * Export data to CSV file (clean native RFC 4180 format with UTF-8 BOM)
 */
export function exportToCSV(data: any[], filename: string) {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const rows = data.map(row =>
        headers.map(h => {
            const val = row[h] ?? '';
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
        }).join(',')
    );

    const csvContent = '\uFEFF' + [headers.map(h => `"${h}"`).join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Export detailed multi-table user profile and records to Excel
 */
export async function exportUserReportToExcel(
    selectedUser: any,
    fullUserDetails: any,
    filename: string
) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SmartClass';
    workbook.created = new Date();

    // Sheet 1: General Information
    const wsInfo = workbook.addWorksheet('Información General');
    wsInfo.views = [{ state: 'frozen', ySplit: 1 }];
    wsInfo.columns = [
        { header: 'Campo', key: 'campo', width: 24 },
        { header: 'Detalle', key: 'detalle', width: 45 }
    ];

    const infoRow1 = wsInfo.getRow(1);
    infoRow1.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    infoRow1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    infoRow1.height = 30;

    const infoRows = [
        { campo: 'ID de Usuario', detalle: selectedUser.id },
        { campo: 'Nombre Completo', detalle: selectedUser.name || 'Sin nombre' },
        { campo: 'Correo Electrónico', detalle: selectedUser.email },
        { campo: 'Rol', detalle: selectedUser.role },
        { campo: 'Fecha de Registro', detalle: selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString('es-ES') : '-' },
    ];
    if (selectedUser.profile) {
        if (selectedUser.profile.identificacion) {
            infoRows.push({ campo: 'Identificación', detalle: selectedUser.profile.identificacion });
        }
        if (selectedUser.profile.telefono) {
            infoRows.push({ campo: 'Teléfono', detalle: selectedUser.profile.telefono });
        }
    }
    wsInfo.addRows(infoRows);
    wsInfo.eachRow((row, rIdx) => {
        if (rIdx > 1) {
            row.alignment = { vertical: 'middle', wrapText: true };
            row.getCell(1).font = { bold: true, color: { argb: 'FF334155' } };
            row.eachCell(cell => {
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                };
            });
        }
    });

    // Sheet 2: Cursos
    if (fullUserDetails?.enrollments?.length > 0) {
        const wsCourses = workbook.addWorksheet('Cursos');
        const courseData = fullUserDetails.enrollments.map((e: any) => ({
            'Curso': e.course?.title || 'Sin título',
            'Fecha Inscripción': e.createdAt ? new Date(e.createdAt).toLocaleDateString('es-ES') : '-',
            'Estado': e.status || 'Activo'
        }));
        setupWorksheetComp(wsCourses, courseData);
    }

    // Sheet 3: Asistencia
    if (fullUserDetails?.attendances?.length > 0) {
        const wsAttendance = workbook.addWorksheet('Asistencia');
        const attendanceData = fullUserDetails.attendances.map((a: any) => ({
            'Fecha': a.date ? new Date(a.date).toLocaleString('es-ES') : '-',
            'Curso': a.course?.title || 'N/A',
            'Estado': a.status || '-',
            'Justificación': a.justification || '-'
        }));
        setupWorksheetComp(wsAttendance, attendanceData);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    triggerDownload(buffer, filename);
}


function triggerDownload(buffer: ExcelJS.Buffer, filename: string) {
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.xlsx`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Format date for export
 */
export function formatDateForExport(date: Date | string | null): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', { timeZone: 'UTC' });
}

/**
 * Format grade for export
 */
export function formatGradeForExport(grade: number | null): string {
    if (grade === null || grade === undefined) return '-';
    return grade.toFixed(1);
}



export interface ExportEvaluationOptions {
    institutionName?: string;
    courseName: string;
    teacherName: string;
    evaluationTitle: string;
    startTime: Date | string;
    endTime: Date | string;
    submissions: any[];
    totalQuestions: number;
    filename?: string;
}

/**
 * Export corporate evaluation submissions and statistics report to Excel
 */
export async function exportEvaluationSubmissionsToExcel({
    institutionName = "SmartClass Academic Suite",
    courseName,
    teacherName,
    evaluationTitle,
    startTime,
    endTime,
    submissions,
    totalQuestions,
    filename,
}: ExportEvaluationOptions) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = institutionName;
    workbook.created = new Date();

    // Calculations
    const totalStudents = submissions.length;
    const submittedOnes = submissions.filter(s => s.submittedAt);
    const inProgressCount = totalStudents - submittedOnes.length;
    const scores = submittedOnes.map(s => Number(s.score) || 0);
    const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
    const minScore = scores.length > 0 ? Math.min(...scores) : 0;
    const passCount = scores.filter(s => s >= 3.0).length;
    const failCount = scores.filter(s => s < 3.0).length;
    const passRate = submittedOnes.length > 0 ? ((passCount / submittedOnes.length) * 100).toFixed(1) : "0.0";
    const totalExpulsions = submissions.reduce((acc, s) => acc + (s.expulsions || 0), 0);

    // ==========================================
    // SHEET 1: Resultados de Evaluación
    // ==========================================
    const ws1 = workbook.addWorksheet('Resultados Evaluación');
    const totalCols = 9;

    // 1. Banner Institucional Principal
    const titleRow = ws1.addRow([`${institutionName.toUpperCase()} • REPORTE EJECUTIVO DE EVALUACIÓN`]);
    ws1.mergeCells(1, 1, 1, totalCols);
    titleRow.height = 34;
    titleRow.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
    titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    titleRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // 2. Subtítulo con Metadatos
    const dateStr = new Date().toLocaleDateString('es-ES') + ' ' + new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const subTitleRow = ws1.addRow([`Evaluación: ${evaluationTitle} | Curso: ${courseName} | Docente: ${teacherName} | Emisión: ${dateStr}`]);
    ws1.mergeCells(2, 1, 2, totalCols);
    subTitleRow.height = 22;
    subTitleRow.font = { name: 'Calibri', size: 9.5, bold: true, italic: true, color: { argb: 'FFFFFFFF' } };
    subTitleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    subTitleRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // 3. Espaciador
    const emptyRow3 = ws1.addRow([]);
    emptyRow3.height = 8;

    // 4. Bloque de Métricas Resumen (Tarjetas KPI en Excel)
    const kpiRow1 = ws1.addRow([
        'TOTAL INSCRITOS', totalStudents,
        'ENTREGAS RECIBIDAS', `${submittedOnes.length} (${totalStudents > 0 ? ((submittedOnes.length / totalStudents) * 100).toFixed(0) : 0}%)`,
        'NOTA PROMEDIO', Number(avgScore.toFixed(2)),
        'APROBADOS (≥ 3.0)', `${passCount} (${passRate}%)`,
        'FALTAS / EXPULSIONES'
    ]);
    kpiRow1.height = 20;
    kpiRow1.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF475569' } };
    kpiRow1.alignment = { vertical: 'middle', horizontal: 'center' };

    const kpiRow2 = ws1.addRow([
        'En Progreso:', inProgressCount,
        'Nota Máxima:', Number(maxScore.toFixed(2)),
        'Nota Mínima:', Number(minScore.toFixed(2)),
        'Reprobados (< 3.0):', failCount,
        'Incidentes Registrados:', totalExpulsions
    ]);
    kpiRow2.height = 20;
    kpiRow2.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF0F172A' } };
    kpiRow2.alignment = { vertical: 'middle', horizontal: 'center' };

    // Estilo suave para bloque KPI
    [kpiRow1, kpiRow2].forEach(row => {
        row.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
            };
        });
    });

    // 5. Espaciador
    const emptyRow6 = ws1.addRow([]);
    emptyRow6.height = 10;

    // 6. Encabezados de Tabla
    const headers = [
        'N°',
        'Estudiante',
        'Correo Electrónico',
        'Estado',
        'Fecha de Entrega',
        'Respuestas',
        'Nota Final (/ 5.0)',
        'Resultado',
        'Expulsiones'
    ];
    const headerRow = ws1.addRow(headers);
    headerRow.height = 26;
    headerRow.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
        cell.border = {
            top: { style: 'medium', color: { argb: 'FF0F172A' } },
            bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
            left: { style: 'thin', color: { argb: 'FF475569' } },
            right: { style: 'thin', color: { argb: 'FF475569' } }
        };
    });

    // 7. Filas de Estudiantes
    submissions.forEach((sub, idx) => {
        const studentName = formatName(sub.user?.name, sub.user?.profile);
        const email = sub.user?.email || 'N/A';
        const isSubmitted = Boolean(sub.submittedAt);
        const statusText = isSubmitted ? 'Enviado' : 'En progreso';
        const submittedDateStr = isSubmitted && sub.submittedAt
            ? new Date(sub.submittedAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
            : '-';
        const answersRatio = `${sub._count?.answersList || 0} / ${totalQuestions}`;
        const scoreNum = sub.score !== null && sub.score !== undefined ? Number(Number(sub.score).toFixed(2)) : 0;
        const resultText = !isSubmitted ? 'EN PROGRESO' : (scoreNum >= 3.0 ? 'APROBADO' : 'REPROBADO');
        const expulsions = sub.expulsions || 0;

        const row = ws1.addRow([
            idx + 1,
            studentName,
            email,
            statusText,
            submittedDateStr,
            answersRatio,
            isSubmitted ? scoreNum : '-',
            resultText,
            expulsions
        ]);
        row.height = 22;
        row.font = { name: 'Calibri', size: 9.5 };

        // Zebra striping
        const bgArgb = idx % 2 === 1 ? 'FFF8FAFC' : 'FFFFFFFF';
        row.eachCell((cell, colIdx) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
            cell.border = {
                bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
            };
            if (colIdx === 1) cell.alignment = { horizontal: 'center', vertical: 'middle' };
            else if (colIdx === 2) cell.alignment = { horizontal: 'left', vertical: 'middle' };
            else if (colIdx === 3) cell.alignment = { horizontal: 'left', vertical: 'middle' };
            else if (colIdx === 4 || colIdx === 5 || colIdx === 6) cell.alignment = { horizontal: 'center', vertical: 'middle' };
            else if (colIdx === 7) {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                if (isSubmitted) {
                    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: scoreNum >= 3.0 ? 'FF16A34A' : 'FFDC2626' } };
                    cell.numFmt = '0.00';
                }
            } else if (colIdx === 8) {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: resultText === 'APROBADO' ? 'FF16A34A' : resultText === 'REPROBADO' ? 'FFDC2626' : 'FFD97706' } };
            } else if (colIdx === 9) {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                if (expulsions > 0) {
                    cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFDC2626' } };
                }
            }
        });
    });

    // 8. Fila de Resumen / Promedio al final
    const footerRow = ws1.addRow([
        '',
        'PROMEDIO GENERAL',
        '',
        `${submittedOnes.length} entregados`,
        '',
        '',
        Number(avgScore.toFixed(2)),
        `${passRate}% aprobados`,
        totalExpulsions > 0 ? `${totalExpulsions} faltas` : '-'
    ]);
    footerRow.height = 24;
    footerRow.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    footerRow.eachCell((cell, colIdx) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
        cell.border = {
            top: { style: 'medium', color: { argb: 'FF94A3B8' } },
            bottom: { style: 'medium', color: { argb: 'FF94A3B8' } },
            left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
        };
        if (colIdx === 2 || colIdx === 7 || colIdx === 8) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
    });

    // Column widths
    ws1.getColumn(1).width = 7;   // N°
    ws1.getColumn(2).width = 34;  // Estudiante
    ws1.getColumn(3).width = 32;  // Correo
    ws1.getColumn(4).width = 15;  // Estado
    ws1.getColumn(5).width = 20;  // Fecha
    ws1.getColumn(6).width = 16;  // Respuestas
    ws1.getColumn(7).width = 18;  // Nota
    ws1.getColumn(8).width = 16;  // Resultado
    ws1.getColumn(9).width = 15;  // Expulsiones

    // Freeze panes at row 7 (headers) and enable autofilter
    ws1.views = [{ state: 'frozen', ySplit: 7 }];
    ws1.autoFilter = {
        from: { row: 7, column: 1 },
        to: { row: ws1.rowCount, column: totalCols }
    };

    // ==========================================
    // SHEET 2: Estadísticas y Distribución
    // ==========================================
    const ws2 = workbook.addWorksheet('Estadísticas y Distribución');
    const s2Cols = 5;

    // Header Banner
    const s2Title = ws2.addRow([`${institutionName.toUpperCase()} • DISTRIBUCIÓN ESTADÍSTICA DE CALIFICACIONES`]);
    ws2.mergeCells(1, 1, 1, s2Cols);
    s2Title.height = 32;
    s2Title.font = { name: 'Calibri', size: 12.5, bold: true, color: { argb: 'FFFFFFFF' } };
    s2Title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    s2Title.alignment = { vertical: 'middle', horizontal: 'center' };

    const s2Sub = ws2.addRow([`Evaluación: ${evaluationTitle} — Rango y Frecuencia de Calificaciones`]);
    ws2.mergeCells(2, 1, 2, s2Cols);
    s2Sub.height = 20;
    s2Sub.font = { name: 'Calibri', size: 9.5, bold: true, italic: true, color: { argb: 'FFFFFFFF' } };
    s2Sub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    s2Sub.alignment = { vertical: 'middle', horizontal: 'center' };

    ws2.addRow([]).height = 10;

    // Tabla de Rangos
    const distHeaders = ['Rango de Calificación', 'Categoría', 'Estudiantes', 'Porcentaje', 'Estado Académico'];
    const distHeaderRow = ws2.addRow(distHeaders);
    distHeaderRow.height = 24;
    distHeaderRow.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    distHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };
    distHeaderRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
        cell.border = {
            top: { style: 'medium', color: { argb: 'FF0F172A' } },
            bottom: { style: 'medium', color: { argb: 'FF0F172A' } }
        };
    });

    const buckets = [0, 0, 0, 0, 0];
    scores.forEach(s => { buckets[Math.min(Math.floor(s), 4)]++; });
    const bucketDefs = [
        { label: '0.00 – 1.00', cat: 'Crítico / Deficiente', pass: false },
        { label: '1.01 – 2.00', cat: 'Bajo / Insuficiente', pass: false },
        { label: '2.01 – 2.99', cat: 'Básico Reprobatorio', pass: false },
        { label: '3.00 – 4.00', cat: 'Aceptable / Aprobado', pass: true },
        { label: '4.01 – 5.00', cat: 'Excelente / Sobresaliente', pass: true }
    ];

    bucketDefs.forEach((b, i) => {
        const count = buckets[i];
        const pct = submittedOnes.length > 0 ? ((count / submittedOnes.length) * 100).toFixed(1) + '%' : '0.0%';
        const r = ws2.addRow([
            b.label,
            b.cat,
            count,
            pct,
            b.pass ? 'APROBATORIO' : 'REPROBATORIO'
        ]);
        r.height = 22;
        r.font = { name: 'Calibri', size: 9.5 };
        const bg = i % 2 === 1 ? 'FFF8FAFC' : 'FFFFFFFF';
        r.eachCell((cell, colIdx) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
            cell.border = {
                bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
            };
            if (colIdx === 1 || colIdx === 3 || colIdx === 4) cell.alignment = { horizontal: 'center', vertical: 'middle' };
            else if (colIdx === 2) cell.alignment = { horizontal: 'left', vertical: 'middle' };
            else if (colIdx === 5) {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: b.pass ? 'FF16A34A' : 'FFDC2626' } };
            }
        });
    });

    ws2.getColumn(1).width = 22;
    ws2.getColumn(2).width = 28;
    ws2.getColumn(3).width = 16;
    ws2.getColumn(4).width = 16;
    ws2.getColumn(5).width = 20;

    // Buffer and download
    const safeTitle = (evaluationTitle || 'Evaluacion').replace(/[^a-zA-Z0-9_\-]/g, '_');
    const safeFilename = filename || `Reporte_Evaluacion_${safeTitle}_${new Date().toISOString().split('T')[0]}`;
    const buffer = await workbook.xlsx.writeBuffer();
    triggerDownload(buffer, safeFilename);
}
