import { Worker } from 'bullmq';
import { connection } from '../../jobs/queue.js';
import { env } from '../../config/env.js';
import { runOnedriveSync, type SyncStats } from './onedrive-sync.job.js';

export async function startOnedriveSyncWorker() {
  const worker = new Worker(
    'sync-onedrive',
    async (job) => {
      const stats = await runOnedriveSync(env.ONEDRIVE_ROOT, async (current, total, message) => {
        await job.updateProgress({ current, total, message, complete: false });
      });

      const finalMessage = `✅ Selesai! Baru: ${stats.copied}, Skipped: ${stats.skipped}, Gagal: ${stats.failed}`;
      const progress = job.progress as { total?: number } | number;
      const total = typeof progress === 'object' ? progress.total ?? 0 : 0;
      await job.updateProgress({ current: total, total, message: finalMessage, complete: true });

      return stats;
    },
    { connection, concurrency: 1 },
  );

  worker.on('completed', (job, result: SyncStats) => {
    console.log(`[sync-onedrive] job ${job.id} selesai`, result);
  });

  worker.on('failed', (job, err) => {
    console.error(`[sync-onedrive] job ${job?.id} gagal:`, err);
  });

  console.log('☁️  OneDrive sync worker jalan (on-demand, dipicu via POST /sync/onedrive/start).');

  return worker;
}
