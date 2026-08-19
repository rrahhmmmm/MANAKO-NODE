'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ReminderRow } from './ReminderRow';

export type ReminderItem = {
  termin_id: number;
  project_id: number;
  project_name: string;
  project_code: string | null;
  termin_name: string | null;
  due_date: string;
  doc_type: string;
  doc_label: string | null;
  days_overdue: number;
  days_until_due: number;
};

type RemindersResponse = { items: ReminderItem[]; total: number; page: number; per_page: number };

type Tab = 'overdue' | 'pending';

export function ReminderTabs() {
  const token = useAuthStore((s) => s.access_token);
  const [tab, setTab] = useState<Tab>('overdue');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['reminders', tab, page],
    queryFn: () => {
      const params = new URLSearchParams({ tab, page: String(page) });
      return apiFetch<RemindersResponse>(`/dashboard/reminders?${params.toString()}`, {
        token: token ?? undefined,
      });
    },
    enabled: !!token,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.per_page)) : 1;

  function switchTab(next: Tab) {
    setTab(next);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant={tab === 'overdue' ? 'default' : 'outline'} size="sm" onClick={() => switchTab('overdue')}>
          Overdue
        </Button>
        <Button variant={tab === 'pending' ? 'default' : 'outline'} size="sm" onClick={() => switchTab('pending')}>
          Pending
        </Button>
      </div>

      {error && <div className="text-destructive text-sm">{(error as Error).message}</div>}

      <div className="space-y-2">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        {data?.items.map((item) => (
          <ReminderRow key={`${item.termin_id}-${item.doc_type}`} item={item} />
        ))}
        {!isLoading && data?.items.length === 0 && (
          <div className="text-center text-muted-foreground py-8 border rounded-xl">
            {tab === 'overdue' ? 'Tidak ada termin yang overdue.' : 'Tidak ada termin yang pending.'}
          </div>
        )}
      </div>

      {data && data.total > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Halaman {data.page} dari {totalPages} ({data.total} pengingat)
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Sebelumnya
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Berikutnya
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
