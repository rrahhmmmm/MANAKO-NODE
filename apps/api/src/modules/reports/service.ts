import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import type { ReportQuery } from './schema.js';

export async function getAvailableYears(): Promise<number[]> {
  const rows = await prisma.$queryRaw<{ year: number }[]>`
    SELECT DISTINCT EXTRACT(YEAR FROM created_at)::int AS year
    FROM projects
    ORDER BY year DESC
  `;
  return rows.map((r) => r.year);
}

/**
 * projects.created_at adalah timestamptz tanpa konfigurasi timezone eksplisit di app ini.
 * Filter tahun report memakai asumsi WIB (UTC+7) — beda dari dropdown getAvailableYears()
 * yang cukup pakai EXTRACT (docs/05-business-logic.md §8.1: filter dari created_at, bukan start_date).
 */
function yearRangeWib(year: number): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(year, 0, 1, -7, 0, 0)),
    end: new Date(Date.UTC(year + 1, 0, 1, -7, 0, 0)),
  };
}

export type ReportDocColumn = {
  keyname: string;
  label: string | null;
};

export type ReportDocCell = {
  status: 0 | 1 | 2;
  custom_label: string | null;
};

export type ReportTerminRow = {
  project_id: number;
  project_code: string | null;
  project_name: string;
  no_kontrak: string | null;
  termin_id: number;
  termin_name: string | null;
  period_start: Date | null;
  period_end: Date | null;
  pr_numbers: string | null;
  po_numbers: string | null;
  dpp: number;
  ppn: number;
  progress: number;
  doc_status: Record<string, ReportDocCell>;
};

type BaseRow = {
  project_id: number;
  project_code: string | null;
  project_name: string;
  no_kontrak: string | null;
  termin_id: number;
  termin_name: string | null;
  period_start: Date | null;
  period_end: Date | null;
  amount: string | null;
  pr_numbers: string | null;
  po_numbers: string | null;
};

export async function getReportData(
  params: ReportQuery,
): Promise<{ columns: ReportDocColumn[]; rows: ReportTerminRow[] }> {
  const columns = (
    await prisma.docType.findMany({
      where: { stage: 'pelaksanaan', keyname: { not: null } },
      orderBy: { priority: 'asc' },
    })
  ).map((dt) => ({ keyname: dt.keyname as string, label: dt.label }));

  const { start, end } = yearRangeWib(params.year);

  // INNER JOIN termins -> project tanpa termin otomatis ter-exclude (docs/05 §8.2).
  // Quirk classification IS NULL dianggap 'rutin' (konsisten dengan dashboard, docs/05 §7.4).
  const baseRows = await prisma.$queryRaw<BaseRow[]>`
    SELECT
      p.id AS project_id,
      p.code AS project_code,
      p.name AS project_name,
      p.no_kontrak,
      t.id AS termin_id,
      t.name AS termin_name,
      t.period_start,
      t.period_end,
      t.amount::text AS amount,
      (
        SELECT string_agg(idoc.no_document, E'\n' ORDER BY idoc.id)
        FROM pr_po_termin_coverage cov
        JOIN initiation_documents idoc ON idoc.id = cov.init_doc_id
        WHERE cov.termin_id = t.id AND idoc.doc_type = 'PR'
      ) AS pr_numbers,
      (
        SELECT string_agg(idoc.no_document, E'\n' ORDER BY idoc.id)
        FROM pr_po_termin_coverage cov
        JOIN initiation_documents idoc ON idoc.id = cov.init_doc_id
        WHERE cov.termin_id = t.id AND idoc.doc_type = 'PO'
      ) AS po_numbers
    FROM projects p
    JOIN termins t ON t.project_id = p.id
    WHERE p.created_at >= ${start} AND p.created_at < ${end}
      AND (
        p.classification = ${params.classification}::"Classification"
        OR (p.classification IS NULL AND ${params.classification} = 'rutin')
      )
    ORDER BY p.id ASC, t.order_index ASC, t.id ASC
  `;

  const terminIds = baseRows.map((r) => r.termin_id);

  const [docStatuses, bypassed] = terminIds.length
    ? await Promise.all([
        prisma.$queryRaw<{ termin_id: number; doc_type: string; status: number; custom_label: string | null }[]>`
          SELECT termin_id, doc_type, status, custom_label
          FROM termin_documents
          WHERE termin_id IN (${Prisma.join(terminIds)})
        `,
        prisma.$queryRaw<{ termin_id: number; doc_type: string }[]>`
          SELECT termin_id, doc_type
          FROM document_requirements
          WHERE scope = 'termin' AND bypass_check = true AND termin_id IN (${Prisma.join(terminIds)})
        `,
      ])
    : [[], []];

  const uploadedByTermin = new Map<number, Map<string, { status: number; custom_label: string | null }>>();
  for (const d of docStatuses) {
    if (!uploadedByTermin.has(d.termin_id)) uploadedByTermin.set(d.termin_id, new Map());
    uploadedByTermin.get(d.termin_id)!.set(d.doc_type, { status: d.status, custom_label: d.custom_label });
  }

  const bypassedByTermin = new Map<number, Set<string>>();
  for (const b of bypassed) {
    if (!bypassedByTermin.has(b.termin_id)) bypassedByTermin.set(b.termin_id, new Set());
    bypassedByTermin.get(b.termin_id)!.add(b.doc_type);
  }

  const rows: ReportTerminRow[] = baseRows.map((r) => {
    const uploaded = uploadedByTermin.get(r.termin_id);
    const bypassSet = bypassedByTermin.get(r.termin_id);

    const doc_status: Record<string, ReportDocCell> = {};
    let doneCount = 0;
    for (const col of columns) {
      const up = uploaded?.get(col.keyname);
      let cell: ReportDocCell;
      if (up && up.status === 1) {
        cell = { status: 1, custom_label: col.keyname === 'TTB' ? up.custom_label : null };
        doneCount++;
      } else if (bypassSet?.has(col.keyname)) {
        cell = { status: 2, custom_label: null };
        doneCount++;
      } else {
        cell = { status: 0, custom_label: null };
      }
      doc_status[col.keyname] = cell;
    }

    const amount = r.amount ? Number(r.amount) : 0;
    const dpp = amount / (1 + env.PPN_RATE);
    const ppn = amount - dpp;
    const progress = columns.length ? Math.round((100 * doneCount) / columns.length) : 0;

    return {
      project_id: r.project_id,
      project_code: r.project_code,
      project_name: r.project_name,
      no_kontrak: r.no_kontrak,
      termin_id: r.termin_id,
      termin_name: r.termin_name,
      period_start: r.period_start,
      period_end: r.period_end,
      pr_numbers: r.pr_numbers,
      po_numbers: r.po_numbers,
      dpp,
      ppn,
      progress,
      doc_status,
    };
  });

  return { columns, rows };
}
