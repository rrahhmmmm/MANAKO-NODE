'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { CloudUpload } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useSyncProgress } from '@/lib/hooks/useSyncProgress';
import { Button } from '@/components/ui/button';

export default function SyncPage() {
  const token = useAuthStore((s) => s.access_token);
  const [jobId, setJobId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const { data: status } = useSyncProgress(jobId);
  const running = !!status && !status.complete;

  async function handleStart() {
    setStarting(true);
    try {
      const res = await apiFetch<{ job_id: string }>('/sync/onedrive/start', {
        method: 'POST',
        token: token ?? undefined,
      });
      setJobId(res.job_id);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'SYNC_IN_PROGRESS') {
        const existingJobId = (err.details as { job_id?: string } | undefined)?.job_id;
        if (existingJobId) {
          setJobId(existingJobId);
          toast.info('Sinkronisasi sudah berjalan, menampilkan progress berjalan');
          return;
        }
      }
      if (err instanceof ApiError && err.code === 'ONEDRIVE_NOT_CONFIGURED') {
        toast.error('ONEDRIVE_ROOT belum dikonfigurasi di server');
      } else {
        toast.error((err as Error).message);
      }
    } finally {
      setStarting(false);
    }
  }

  const percent = status && status.total > 0 ? Math.round((status.current / status.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Sync OneDrive</h1>
        <p className="text-sm text-muted-foreground">
          Salin file kontrak, dokumen inisiasi, dan dokumen termin ke folder OneDrive.
        </p>
      </div>

      <div className="max-w-xl space-y-4 rounded-xl border p-4">
        <Button onClick={handleStart} disabled={starting || running}>
          <CloudUpload />
          {running ? 'Sedang sinkronisasi...' : 'Mulai Sinkronisasi'}
        </Button>

        {status && (
          <div className="space-y-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {status.current}/{status.total} — {status.message}
            </p>
            {status.error && <p className="text-sm text-destructive">{status.error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
