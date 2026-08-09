import type { FastifyInstance } from 'fastify';
import { authGuard } from '../../middleware/auth.js';
import { ok, fail } from '../../lib/response.js';
import { prisma } from '../../lib/prisma.js';

// Mount di /api/v1 tanpa prefix — path berupa /projects/:id/termins & /termins/:id
export async function terminsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);

  app.get('/projects/:id/termins', async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    if (!Number.isInteger(id)) return reply.code(400).send(fail('BAD_REQUEST', 'ID invalid'));
    const rows = await prisma.termin.findMany({
      where: { project_id: id },
      orderBy: { order_index: 'asc' },
    });
    return ok(rows);
  });

  app.get('/termins/:id', async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    if (!Number.isInteger(id)) return reply.code(400).send(fail('BAD_REQUEST', 'ID invalid'));
    const termin = await prisma.termin.findUnique({ where: { id } });
    if (!termin) return reply.code(404).send(fail('NOT_FOUND', 'Termin tidak ditemukan'));
    return ok(termin);
  });

  // TODO: POST /projects/:id/termins, PATCH /termins/:id, DELETE /termins/:id
  //       + requirements sub-routes
}
