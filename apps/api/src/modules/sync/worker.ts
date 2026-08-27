import { startAutoProgress } from '../../jobs/worker.js';
import { startOnedriveSyncWorker } from './onedrive-sync.worker.js';

// Entrypoint proses worker (dijalankan via `pnpm start:worker`, terpisah dari API server).
async function main() {
  await Promise.all([startAutoProgress(), startOnedriveSyncWorker()]);
}

void main();
