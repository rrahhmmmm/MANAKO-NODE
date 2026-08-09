import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard } from '../../middleware/auth.js';
import { ok } from '../../lib/response.js';
import { prisma } from '../../lib/prisma.js';

const yearQuery = z.object({ year: z.coerce.number().int().optional() });

export async function dashboardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);

  app.get('/stats', async (req) => {
    const { year } = yearQuery.parse(req.query);
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
    return ok({ running, completed, inisiasi, cancelled });
  });

  app.get('/reminders', async () => ok({ items: [], total: 0, todo: true }));
  app.get('/projects', async () => ok({ items: [], total: 0, todo: true }));
}
