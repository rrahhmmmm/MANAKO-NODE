import { Queue } from 'bullmq';
import { connection } from '../../jobs/queue.js';

export const ACTIVE_SYNC_JOB_ID = 'onedrive-sync-active';

export const onedriveSyncQueue = new Queue('sync-onedrive', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 60 * 60 },
    removeOnFail: { age: 24 * 60 * 60 },
  },
});
