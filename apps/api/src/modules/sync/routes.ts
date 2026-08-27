import type { FastifyInstance } from 'fastify';
import { authGuard, requireRole } from '../../middleware/auth.js';
import { ok, fail } from '../../lib/response.js';
import { env } from '../../config/env.js';
import { ACTIVE_SYNC_JOB_ID, onedriveSyncQueue } from './queue.js';

export async function syncRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);
  app.addHook('preHandler', requireRole('admin', 'inspector'));

  app.post('/onedrive/start', async (req, reply) => {
    if (!env.ONEDRIVE_ROOT) {
      return reply.code(400).send(fail('ONEDRIVE_NOT_CONFIGURED', 'ONEDRIVE_ROOT belum dikonfigurasi di server'));
    }

    const existing = await onedriveSyncQueue.getJob(ACTIVE_SYNC_JOB_ID);
    if (existing) {
      const state = await existing.getState();
      if (state === 'waiting' || state === 'active' || state === 'delayed') {
        return reply
          .code(409)
          .send(fail('SYNC_IN_PROGRESS', 'Sinkronisasi sedang berjalan', { job_id: existing.id }));
      }
      await existing.remove();
    }

    const job = await onedriveSyncQueue.add('sync', {}, { jobId: ACTIVE_SYNC_JOB_ID });
    return ok({ job_id: job.id });
  });

  app.get('/onedrive/status/:job_id', async (req, reply) => {
    const { job_id } = req.params as { job_id: string };
    const job = await onedriveSyncQueue.getJob(job_id);
    if (!job) {
      return reply.code(404).send(fail('NOT_FOUND', 'Job tidak ditemukan'));
    }

    const state = await job.getState();
    const progress = job.progress as
      | { current?: number; total?: number; message?: string; complete?: boolean }
      | number;

    if (typeof progress !== 'object') {
      return ok({ current: 0, total: 0, message: state, complete: state === 'completed' || state === 'failed' });
    }

    return ok({
      current: progress.current ?? 0,
      total: progress.total ?? 0,
      message: progress.message ?? state,
      complete: progress.complete ?? (state === 'completed' || state === 'failed'),
      ...(state === 'failed' ? { error: job.failedReason } : {}),
    });
  });

  // SSE opsional (docs §9.4) — di-skip; polling status/:job_id sudah cukup untuk job on-demand berdurasi pendek.
}
