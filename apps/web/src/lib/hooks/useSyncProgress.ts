'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

export type SyncStatus = {
  current: number;
  total: number;
  message: string;
  complete: boolean;
  error?: string;
};

export function useSyncProgress(jobId: string | null) {
  const token = useAuthStore((s) => s.access_token);

  return useQuery({
    queryKey: ['sync-onedrive-status', jobId],
    queryFn: () => apiFetch<SyncStatus>(`/sync/onedrive/status/${jobId}`, { token: token ?? undefined }),
    enabled: !!jobId && !!token,
    refetchInterval: (query) => (query.state.data?.complete ? false : 1500),
  });
}
