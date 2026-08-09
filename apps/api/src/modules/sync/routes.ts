import type { FastifyInstance } from 'fastify';
import { authGuard, requireRole } from '../../middleware/auth.js';
import { ok } from '../../lib/response.js';

export async function syncRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);
  app.addHook('preHandler', requireRole('admin', 'inspector'));

  app.post('/onedrive/start', async () => ok({ job_id: 'todo' }));
  app.get('/onedrive/status/:job_id', async () => ok({ current: 0, total: 0, complete: false, todo: true }));
}
