import { Worker } from 'bullmq';
import { autoProgressQueue, connection } from './queue.js';
import { runAutoProgress } from './auto-progress.job.js';

export async function startAutoProgress() {
  const worker = new Worker('auto-progress', async () => runAutoProgress(), { connection });

  worker.on('completed', (job, result: { updated: number }) => {
    console.log(`[auto-progress] job ${job.id} selesai — ${result.updated} project diupdate`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[auto-progress] job ${job?.id} gagal:`, err);
  });

  await autoProgressQueue.add(
    'auto-progress',
    {},
    { repeat: { every: 60 * 60 * 1000 }, jobId: 'auto-progress-repeat' },
  );

  console.log('🔁 Auto-progress worker jalan, cron tiap 1 jam.');

  return worker;
}
