'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ReportDocCell, type DocCellValue } from './ReportDocCell';

export type ReportColumn = { keyname: string; label: string | null };

export type ReportRow = {
  project_id: number;
  project_code: string | null;
  project_name: string;
  no_kontrak: string | null;
  termin_id: number;
  termin_name: string | null;
  period_start: string | null;
  period_end: string | null;
  pr_numbers: string | null;
  po_numbers: string | null;
  dpp: number;
  ppn: number;
  progress: number;
  doc_status: Record<string, DocCellValue>;
};

const dateFmt = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
const numberFmt = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });

function formatDate(v: string | null) {
  return v ? dateFmt.format(new Date(v)) : '-';
}

export function ReportPreviewTable({ columns, rows }: { columns: ReportColumn[]; rows: ReportRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12 border rounded-xl">
        Tidak ada data untuk filter ini.
      </div>
    );
  }

  // rowSpan per project: hitung berapa row berurutan share project_id yang sama,
  // supaya kolom project cukup dirender sekali per grup (docs/06 §4.6 "project cells merged").
  const rowSpans: number[] = rows.map((row, i) => {
    const prev = rows[i - 1];
    if (prev && prev.project_id === row.project_id) return 0;
    let span = 1;
    for (let j = i + 1; j < rows.length && rows[j].project_id === row.project_id; j++) span++;
    return span;
  });

  return (
    <div className="border rounded-xl overflow-auto max-h-[70vh]">
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10">
          <TableRow>
            <TableHead>Kode</TableHead>
            <TableHead>Nama Project</TableHead>
            <TableHead>No Kontrak</TableHead>
            <TableHead>Termin</TableHead>
            <TableHead>Periode</TableHead>
            <TableHead>PR</TableHead>
            <TableHead>PO</TableHead>
            <TableHead className="text-right">DPP</TableHead>
            <TableHead className="text-right">PPN</TableHead>
            {columns.map((c) => (
              <TableHead key={c.keyname} className="text-center">
                {c.label ?? c.keyname}
              </TableHead>
            ))}
            <TableHead className="text-center">Progress</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => {
            const span = rowSpans[i];
            return (
              <TableRow key={row.termin_id}>
                {span > 0 && (
                  <TableCell rowSpan={span} className="align-top font-mono text-xs">
                    {row.project_code ?? '-'}
                  </TableCell>
                )}
                {span > 0 && (
                  <TableCell rowSpan={span} className="align-top font-medium whitespace-normal">
                    {row.project_name}
                  </TableCell>
                )}
                {span > 0 && (
                  <TableCell rowSpan={span} className="align-top whitespace-normal">
                    {row.no_kontrak ?? '-'}
                  </TableCell>
                )}
                <TableCell>{row.termin_name ?? `Termin #${row.termin_id}`}</TableCell>
                <TableCell className="whitespace-nowrap text-xs">
                  {formatDate(row.period_start)} – {formatDate(row.period_end)}
                </TableCell>
                <TableCell className="whitespace-pre-line text-xs">{row.pr_numbers ?? '-'}</TableCell>
                <TableCell className="whitespace-pre-line text-xs">{row.po_numbers ?? '-'}</TableCell>
                <TableCell className="text-right">{numberFmt.format(row.dpp)}</TableCell>
                <TableCell className="text-right">{numberFmt.format(row.ppn)}</TableCell>
                {columns.map((c) => (
                  <TableCell key={c.keyname} className="text-center">
                    <ReportDocCell docType={c.keyname} cell={row.doc_status[c.keyname] ?? { status: 0, custom_label: null }} />
                  </TableCell>
                ))}
                <TableCell className="text-center">{row.progress}%</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
