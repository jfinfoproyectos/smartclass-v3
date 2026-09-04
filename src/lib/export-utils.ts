import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

/**
 * Export data to Excel file with styling
 */
export async function exportToExcel(data: any[], filename: string, sheetName: string = 'Datos') {
    if (data.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    setupWorksheetComp(worksheet, data);

    // Buffer and Download
    const buffer = await workbook.xlsx.writeBuffer();
    triggerDownload(buffer, filename);
}

/**
 * Export multiple sheets to Excel with styling
 */
export async function exportMultiSheetExcel(sheets: { name: string; data: any[] }[], filename: string) {
    const workbook = new ExcelJS.Workbook();

    sheets.forEach(sheetData => {
        if (sheetData.data.length > 0) {
            const worksheet = workbook.addWorksheet(sheetData.name);
            setupWorksheetComp(worksheet, sheetData.data);
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
    const worksheet = workbook.addWorksheet(sheetName);

    // 1. Prepare Columns and Hierarchical Headers
    // Base columns: ID, Estudiante, Correo
    const baseHeaders = ['ID', 'Estudiante', 'Correo'];
    const hierarchy = data[0]._hierarchy || [];
    
    // Row 1: Categories
    // Row 2: Groups / Totals
    const headerRow1: string[] = [...baseHeaders];
    const headerRow2: string[] = ['', '', ''];

    hierarchy.forEach((cat: any) => {
        // Add Category Total Column
        headerRow1.push(`${cat.name} (${cat.weight}%)`);
        headerRow2.push('PROMEDIO CORTE');

        // Add Group Columns
        cat.groups.forEach((group: any) => {
            headerRow1.push(''); // Will be merged later
            headerRow2.push(`${group.name} (${group.weight}%)`);
        });
    });

    headerRow1.push('NOTA FINAL');
    headerRow2.push('');

    // Add headers to worksheet
    worksheet.addRow(headerRow1);
    worksheet.addRow(headerRow2);

    // 2. Add Data Rows
    data.forEach(student => {
        const rowData: any[] = [student['ID'], student['Estudiante'], student['Correo']];
        
        hierarchy.forEach((cat: any) => {
            // Find student's grade for this category in the hierarchy
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
    // Merge Category headers
    let currentCol = baseHeaders.length + 1;
    hierarchy.forEach((cat: any) => {
        const groupCount = cat.groups.length;
        const endCol = currentCol + groupCount;
        if (groupCount > 0) {
            worksheet.mergeCells(1, currentCol, 1, endCol);
        }
        currentCol = endCol + 1;
    });

    // Merge Base headers and Nota Final vertically
    [1, 2, 3, currentCol].forEach(colIndex => {
        worksheet.mergeCells(1, colIndex, 2, colIndex);
    });

    // Style both header rows
    [1, 2].forEach(rowNum => {
        const row = worksheet.getRow(rowNum);
        row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: rowNum === 1 ? 'FF1F2937' : 'FF374151' }
        };
        row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    });

    worksheet.getRow(1).height = 35;
    worksheet.getRow(2).height = 30;

    // Set column widths
    worksheet.columns.forEach((col, i) => {
        if (i < 3) col.width = i === 1 ? 35 : 15;
        else col.width = 12;
    });

    // Style data cells
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber <= 2) return;
        
        row.eachCell((cell, colNumber) => {
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
            };
            
            // Grade coloring logic (similar to setupWorksheetComp)
            const val = parseFloat(cell.value?.toString() || '');
            if (!isNaN(val)) {
                if (val < 3.0) cell.font = { color: { argb: 'FFEF4444' } };
                else if (val >= 4.5) cell.font = { color: { argb: 'FF15803D' }, bold: true };
                cell.alignment = { horizontal: 'center' };
            }
        });
    });

    // Last Column (Nota Final) Bold
    const lastColIndex = baseHeaders.length + hierarchy.reduce((acc: number, cat: any) => acc + cat.groups.length + 1, 0) + 1;
    worksheet.getColumn(lastColIndex).eachCell((cell, rowNum) => {
        if (rowNum > 2) {
            cell.font = { ...cell.font, bold: true };
        }
    });

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

    // Parse Feedback
    const rawFeedback = submission?.feedback || '';
    const { tableRows, cleanLines } = parseFeedbackContent(rawFeedback);

    // 2. Tabla de Archivos Evaluados (Si aplica)
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

    // 3. Enunciado / Rúbrica
    if (activity.statement) {
        addSectionHeader('Enunciado / Rúbrica de Evaluación');
        const stmtText = activity.statement.replace(/\\n/g, '\n').replace(/[*`#]/g, '');
        const stmtRow = worksheet.addRow([stmtText]);
        worksheet.mergeCells(`A${stmtRow.number}:C${stmtRow.number}`);
        stmtRow.alignment = { wrapText: true, vertical: 'top' };
        worksheet.addRow([]);
    }

    // 4. Retroalimentación Detallada
    addSectionHeader('Análisis y Retroalimentación Detallada');
    if (cleanLines.length > 0) {
        cleanLines.forEach(line => {
            const lineRow = worksheet.addRow([line]);
            worksheet.mergeCells(`A${lineRow.number}:C${lineRow.number}`);
            lineRow.alignment = { wrapText: true, vertical: 'top' };
        });
    } else {
        const fbRow = worksheet.addRow([rawFeedback || 'Sin retroalimentación registrada.']);
        worksheet.mergeCells(`A${fbRow.number}:C${fbRow.number}`);
        fbRow.alignment = { wrapText: true, vertical: 'top' };
    }

    worksheet.getColumn(1).width = 25;
    worksheet.getColumn(2).width = 35;
    worksheet.getColumn(3).width = 35;

    const safeFilename = filename || `Retroalimentacion_${studentName.replace(/\s+/g, '_')}_${activity.title.replace(/\s+/g, '_')}`;
    const buffer = await workbook.xlsx.writeBuffer();
    triggerDownload(buffer, safeFilename);
}

/**
 * Helper to setup worksheet columns and styles
 */
function setupWorksheetComp(worksheet: ExcelJS.Worksheet, data: any[]) {
    if (data.length === 0) return;

    // Get headers
    const headers = Object.keys(data[0]);
    const columns = headers.map(header => ({
        header: header,
        key: header,
        width: Math.max(header.length + 2, 15)
    }));

    worksheet.columns = columns;
    worksheet.addRows(data);

    // Styling
    // 1. Header Row Style
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F2937' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 30;

    // 2. Data Rows Style
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        row.alignment = { vertical: 'middle', horizontal: 'left' };

        row.eachCell((cell, colNumber) => {
            const columnKey = columns[colNumber - 1].key;

            // Borders
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
            };

            // Grade Coloring
            const val = cell.value?.toString();

            if (val) {
                if (val === '0.0' || val === '0,0') {
                    cell.font = { color: { argb: 'FFEF4444' }, bold: true };
                    cell.alignment = { horizontal: 'center' };
                }
                else if (/^[0-5][.,]\d$/.test(val) || /^[0-5]$/.test(val)) {
                    cell.alignment = { horizontal: 'center' };
                    const numGrade = parseFloat(val.replace(',', '.'));
                    if (numGrade < 3.0) {
                        cell.font = { color: { argb: 'FFEF4444' } };
                    } else if (numGrade >= 4.5) {
                        cell.font = { color: { argb: 'FF15803D' }, bold: true };
                    }
                }
            }

            if (columnKey === 'Nota Final' || columnKey === 'Promedio') {
                cell.font = { bold: true };
                const val = cell.value?.toString();
                if (val) {
                    const numGrade = parseFloat(val.replace(',', '.'));
                    if (numGrade < 3.0) {
                        cell.font = { color: { argb: 'FFEF4444' }, bold: true };
                    }
                }
            }
        });
    });

    // Auto-filter
    worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: columns.length }
    };
}

/**
 * Export data to CSV file
 */
export function exportToCSV(data: any[], filename: string) {
    // Create worksheet from data
    const ws = XLSX.utils.json_to_sheet(data);

    // Convert to CSV
    const csv = XLSX.utils.sheet_to_csv(ws);

    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

