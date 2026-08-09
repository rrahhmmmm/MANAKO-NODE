import type { FastifyInstance } from 'fastify';
import { authGuard } from '../../middleware/auth.js';
import { ok } from '../../lib/response.js';
import { prisma } from '../../lib/prisma.js';

export async function vendorsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);

  app.get('/', async (req) => {
    const q = (req.query as { search?: string }).search?.trim();
    const vendors = await prisma.vendor.findMany({
      where: q ? { name: { contains: q, mode: 'insensitive' } } : undefined,
      orderBy: { name: 'asc' },
    });
    return ok(vendors);
  });

  // TODO: /:id, /:id/pic, /:id/previous-projects, POST, PATCH, DELETE
}
