import ExcelJS from 'exceljs';
import type { ReportDocColumn, ReportTerminRow } from './service.js';

const FIXED_HEADERS = [
  'Kode Project',
  'Nama Project',
  'No Kontrak',
  'Termin',
  'Periode Awal',
  'Periode Akhir',
  'PR',
  'PO',
  'DPP',
  'PPN',
];

const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
const GREEN_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
const RED_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
};

const MAX_COL_WIDTH = 50;

export function buildReportWorkbook(
  columns: ReportDocColumn[],
  rows: ReportTerminRow[],
  meta: { year: number; classification: 'rutin' | 'non_rutin' },
): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Manako';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(`Laporan ${meta.year}`, {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  const headers = [...FIXED_HEADERS, ...columns.map((c) => c.label ?? c.keyname), 'Progress (%)'];
  const headerRow = sheet.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = HEADER_FILL;
    cell.border = THIN_BORDER;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });

  const maxLen = headers.map((h) => h.length);
  const bumpWidth = (index0: number, len: number) => {
    maxLen[index0] = Math.max(maxLen[index0] ?? 0, len);
  };

  for (const row of rows) {
    const values: (string | number | Date | null)[] = [
      row.project_code,
      row.project_name,
      row.no_kontrak,
      row.termin_name,
      row.period_start,
      row.period_end,
      row.pr_numbers,
      row.po_numbers,
      row.dpp,
      row.ppn,
    ];

    const excelRow = sheet.addRow(values);
    excelRow.getCell(5).numFmt = 'dd/mm/yyyy';
    excelRow.getCell(6).numFmt = 'dd/mm/yyyy';
    excelRow.getCell(9).numFmt = '#,##0.00';
    excelRow.getCell(10).numFmt = '#,##0.00';

    values.forEach((v, i) => {
      const len = v instanceof Date ? 10 : String(v ?? '').length;
      bumpWidth(i, len);
    });

    columns.forEach((col, idx) => {
      const cellIndex = FIXED_HEADERS.length + idx + 1;
      const cell = excelRow.getCell(cellIndex);
      const status = row.doc_status[col.keyname];

      if (status?.status === 1 && status.custom_label) {
        cell.value = status.custom_label;
        cell.font = { color: { argb: 'FF000000' } };
        bumpWidth(cellIndex - 1, status.custom_label.length);
      } else if (status?.status === 1 || status?.status === 2) {
        cell.value = '✓';
        cell.fill = GREEN_FILL;
        cell.font = { color: { argb: 'FF006100' } };
        bumpWidth(cellIndex - 1, 3);
      } else {
        cell.value = '✗';
        cell.fill = RED_FILL;
        cell.font = { color: { argb: 'FF9C0006' } };
        bumpWidth(cellIndex - 1, 3);
      }
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = THIN_BORDER;
    });

    const progressIndex = FIXED_HEADERS.length + columns.length + 1;
    const progressCell = excelRow.getCell(progressIndex);
    progressCell.value = row.progress;
    progressCell.numFmt = '0"%"';
    progressCell.alignment = { horizontal: 'center' };
    bumpWidth(progressIndex - 1, 6);

    excelRow.eachCell((cell) => {
      cell.border = THIN_BORDER;
    });
  }

  headers.forEach((_, i) => {
    sheet.getColumn(i + 1).width = Math.min((maxLen[i] ?? 10) + 2, MAX_COL_WIDTH);
  });

  return workbook;
}
