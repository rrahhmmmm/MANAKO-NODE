export type DocCellValue = { status: 0 | 1 | 2; custom_label: string | null };

export function ReportDocCell({ docType, cell }: { docType: string; cell: DocCellValue }) {
  if (cell.status === 1 && docType === 'TTB' && cell.custom_label) {
    return <span className="text-foreground text-xs">{cell.custom_label}</span>;
  }
  if (cell.status === 1 || cell.status === 2) {
    return <span className="text-green-600 font-medium">✓</span>;
  }
  return <span className="text-red-600 font-medium">✗</span>;
}
