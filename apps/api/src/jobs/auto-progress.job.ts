import { prisma } from '../lib/prisma.js';

/**
 * Auto-progress untuk project dengan termin monthly/quarterly (docs/05-business-logic.md §6.2/6.3):
 *   progress = clamp((today - start_date) / (end_date - start_date) * 100, 0, 100)
 * Satu bulk UPDATE (bukan per-row) supaya murah dijalankan tiap jam. Advisory lock 'auto_progress'
 * + guard `progress_percent IS DISTINCT FROM computed.value` mencegah race dengan update manual (§12).
 * Dipanggil baik oleh worker BullMQ maupun endpoint admin manual-trigger — logic tidak diduplikasi.
 */
export async function runAutoProgress(): Promise<{ updated: number }> {
  const updated = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('auto_progress'))`;

    return tx.$executeRaw`
      UPDATE projects p
      SET progress_percent = computed.value
      FROM (
        SELECT p2.id,
          LEAST(100, GREATEST(0,
            (CURRENT_DATE - p2.start_date)::numeric
              / NULLIF((p2.end_date - p2.start_date)::numeric, 0) * 100
          )) AS value
        FROM projects p2
        WHERE p2.status IN ('running', 'inisiasi')
          AND p2.start_date IS NOT NULL
          AND p2.end_date IS NOT NULL
          AND p2.id IN (SELECT DISTINCT project_id FROM termins WHERE type IN ('monthly', 'quarterly'))
      ) computed
      WHERE computed.id = p.id
        AND p.progress_percent IS DISTINCT FROM computed.value
    `;
  });

  return { updated };
}
