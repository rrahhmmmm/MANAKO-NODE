import { startAutoProgress } from '../../jobs/worker.js';

// Entrypoint proses worker (dijalankan via `pnpm start:worker`, terpisah dari API server).
// Saat ini cuma auto-progress; OneDrive sync worker akan ditambahkan di sini nanti.
async function main() {
  await startAutoProgress();
}

void main();
