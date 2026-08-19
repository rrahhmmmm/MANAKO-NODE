import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type { DashboardProjectsQuery, DashboardRemindersQuery } from './schema.js';

export async function getStats(year?: number) {
  const yearFilter = year
    ? {
        start_date: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      }
    : {};
  const [running, completed, inisiasi, cancelled] = await Promise.all([
    prisma.project.count({ where: { status: 'running', ...yearFilter } }),
    prisma.project.count({ where: { status: 'completed', ...yearFilter } }),
    prisma.project.count({ where: { status: 'inisiasi', ...yearFilter } }),
    prisma.project.count({ where: { status: 'cancelled', ...yearFilter } }),
  ]);
  return { running, completed, inisiasi, cancelled };
}

export type ReminderItem = {
  termin_id: number;
  project_id: number;
  project_name: string;
  project_code: string | null;
  termin_name: string | null;
  due_date: Date;
  doc_type: string;
  doc_label: string | null;
  days_overdue: number;
  days_until_due: number;
};

/**
 * "Next step" per termin aktif — satu query CTE untuk hindari N+1 (docs/05-business-logic.md §7).
 * Untuk setiap termin dari project berstatus inisiasi/running, ambil doc_type stage=pelaksanaan
 * dengan priority terkecil yang belum diupload (status=1), belum bypass, dan required (override
 * document_requirements menang atas default doc_types.required — resolve-order sama seperti
 * requirements.service.ts::resolveChecklist). Termin yang semua doc-nya sudah selesai tidak muncul.
 *
 * Diekspor tanpa filter tab/pagination supaya bisa dipakai ulang oleh modul reports (/reports/print
 * depend ke data reminders ini, docs/04-migration-guide.md).
 */
export async function resolveReminders(): Promise<ReminderItem[]> {
  return prisma.$queryRaw<ReminderItem[]>`
    WITH active_termins AS (
      SELECT t.id AS termin_id, t.project_id, t.name AS termin_name, t.due_date,
             p.name AS project_name, p.code AS project_code
      FROM termins t
      JOIN projects p ON p.id = t.project_id
      WHERE p.status IN ('inisiasi', 'running')
    ),
    resolved_checklist AS (
      SELECT at.termin_id, dt.keyname AS doc_type, dt.label, dt.priority,
             COALESCE(dr.required, dt.required) AS required,
             COALESCE(dr.bypass_check, false) AS bypass_check
      FROM active_termins at
      CROSS JOIN doc_types dt
      LEFT JOIN document_requirements dr
        ON dr.scope = 'termin' AND dr.termin_id = at.termin_id AND dr.doc_type = dt.keyname
      WHERE dt.stage = 'pelaksanaan' AND dt.keyname IS NOT NULL
    ),
    pending_docs AS (
      SELECT rc.termin_id, rc.doc_type, rc.label, rc.priority
      FROM resolved_checklist rc
      LEFT JOIN termin_documents td
        ON td.termin_id = rc.termin_id AND td.doc_type = rc.doc_type AND td.status = 1
      WHERE rc.required = true AND rc.bypass_check = false AND td.id IS NULL
    ),
    next_step AS (
      SELECT DISTINCT ON (pd.termin_id) pd.termin_id, pd.doc_type, pd.label, pd.priority
      FROM pending_docs pd
      ORDER BY pd.termin_id, pd.priority ASC
    )
    SELECT
      at.termin_id, at.project_id, at.project_name, at.project_code, at.termin_name, at.due_date,
      ns.doc_type, ns.label AS doc_label,
      GREATEST(0, (CURRENT_DATE - at.due_date))::int AS days_overdue,
      (at.due_date - CURRENT_DATE)::int AS days_until_due
    FROM next_step ns
    JOIN active_termins at ON at.termin_id = ns.termin_id
    WHERE at.due_date IS NOT NULL
  `;
}

export async function getReminders(params: DashboardRemindersQuery) {
  const all = await resolveReminders();
  // overdue: today > due_date (days_overdue > 0); pending: today <= due_date (days_until_due >= 0).
  const filtered = all.filter((r) => (params.tab === 'overdue' ? r.days_overdue > 0 : r.days_until_due >= 0));
  filtered.sort((a, b) =>
    params.tab === 'overdue' ? b.days_overdue - a.days_overdue : a.days_until_due - b.days_until_due,
  );

  const total = filtered.length;
  const start = (params.page - 1) * params.per_page;
  const items = filtered.slice(start, start + params.per_page);

  return { items, total, page: params.page, per_page: params.per_page };
}

export async function getProjects(params: DashboardProjectsQuery) {
  const { tab, search, year, classification, page, per_page } = params;

  // Quirk legacy (docs/05-business-logic.md §7.4): kedua checkbox classification unchecked → 0 hasil,
  // BUKAN fallback ke "semua". Port apa adanya, jangan "diperbaiki".
  if (classification.length === 0) {
    return { items: [], total: 0, page, per_page };
  }

  const classificationClauses: Prisma.ProjectWhereInput[] = [];
  if (classification.includes('rutin')) {
    // classification IS NULL di DB diperlakukan sebagai 'rutin' (quirk legacy).
    classificationClauses.push({ OR: [{ classification: 'rutin' }, { classification: null }] });
  }
  if (classification.includes('non_rutin')) {
    classificationClauses.push({ classification: 'non_rutin' });
  }

  const where: Prisma.ProjectWhereInput = {
    AND: [
      { status: tab },
      { OR: classificationClauses },
      ...(year
        ? [
            {
              start_date: {
                gte: new Date(`${year}-01-01`),
                lt: new Date(`${year + 1}-01-01`),
              },
            } satisfies Prisma.ProjectWhereInput,
          ]
        : []),
      ...(search
        ? [
            {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
              ],
            } satisfies Prisma.ProjectWhereInput,
          ]
        : []),
    ],
  };

  const [total, items] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      include: { vendor: true },
      orderBy: { id: 'desc' },
      skip: (page - 1) * per_page,
      take: per_page,
    }),
  ]);

  return { items, total, page, per_page };
}
