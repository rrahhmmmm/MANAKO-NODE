'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

type Stats = { running: number; completed: number; inisiasi: number; cancelled: number };

export default function DashboardPage() {
  const token = useAuthStore((s) => s.access_token);
  const { data, isLoading, error } = useQuery({
    queryKey: ['stats'],
    queryFn: () => apiFetch<Stats>('/dashboard/stats', { token: token ?? undefined }),
    enabled: !!token,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Ringkasan project & pengingat dokumen.
        </p>
      </div>

      {isLoading && <div>Loading…</div>}
      {error && <div className="text-destructive">{(error as Error).message}</div>}

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Running"   value={data.running}   color="bg-emerald-50 text-emerald-700" />
          <StatCard label="Inisiasi"  value={data.inisiasi}  color="bg-amber-50 text-amber-700" />
          <StatCard label="Completed" value={data.completed} color="bg-blue-50 text-blue-700" />
          <StatCard label="Cancelled" value={data.cancelled} color="bg-rose-50 text-rose-700" />
        </div>
      )}

      <div className="border rounded-xl p-6 text-sm text-muted-foreground">
        Reminders & project list akan datang di iterasi berikut. Lihat{' '}
        <code>docs/06-frontend-pages.md</code> untuk peta halaman.
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <div className="text-sm">{label}</div>
      <div className="text-3xl font-semibold mt-1">{value}</div>
    </div>
  );
}
