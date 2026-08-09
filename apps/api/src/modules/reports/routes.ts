import type { FastifyInstance } from 'fastify';
import { authGuard } from '../../middleware/auth.js';
import { ok } from '../../lib/response.js';
import { prisma } from '../../lib/prisma.js';

export async function reportsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);

  app.get('/years', async () => {
    const rows = await prisma.$queryRaw<{ year: number }[]>`
      SELECT DISTINCT EXTRACT(YEAR FROM start_date)::int AS year
      FROM projects
      WHERE start_date IS NOT NULL
      ORDER BY year DESC
    `;
    return ok(rows.map((r) => r.year));
  });

  app.get('/preview', async () => ok({ items: [], todo: true }));
  app.get('/export.xlsx', async (_req, reply) => reply.code(501).send({ error: 'TODO exceljs' }));
  app.get('/print', async () => ok({ todo: true }));
}
