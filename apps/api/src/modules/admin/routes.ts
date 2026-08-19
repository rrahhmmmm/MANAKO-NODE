import type { FastifyInstance } from 'fastify';
import { authGuard, requireRole } from '../../middleware/auth.js';
import { ok } from '../../lib/response.js';
import { runAutoProgress } from '../../jobs/auto-progress.job.js';

export async function adminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);
  app.addHook('preHandler', requireRole('admin'));

  app.post('/jobs/auto-progress', async () => {
    const result = await runAutoProgress();
    return ok(result);
  });
}
