import type { FastifyInstance } from 'fastify';
import { authGuard, requireRole } from '../../middleware/auth.js';
import { ok } from '../../lib/response.js';
import { prisma } from '../../lib/prisma.js';

export async function usersRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);
  app.addHook('preHandler', requireRole('admin'));

  app.get('/', async () => {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, phone: true, role: true, created_at: true },
      orderBy: { id: 'asc' },
    });
    return ok(users);
  });

  // TODO: POST / PATCH / DELETE
}
