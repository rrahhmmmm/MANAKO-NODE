import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard, requireRole } from '../../middleware/auth.js';
import { ok } from '../../lib/response.js';
import { prisma } from '../../lib/prisma.js';

const stageQuery = z.object({ stage: z.enum(['inisiasi', 'pelaksanaan']).optional() });

export async function docTypesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);

  app.get('/', async (req) => {
    const { stage } = stageQuery.parse(req.query);
    const rows = await prisma.docType.findMany({
      where: stage ? { stage } : undefined,
      orderBy: [{ stage: 'asc' }, { priority: 'asc' }, { keyname: 'asc' }],
    });
    return ok(rows);
  });

  // TODO: POST / PATCH / DELETE (admin only)
  app.post('/', { preHandler: requireRole('admin') }, async () => ok({ todo: true }));
}
