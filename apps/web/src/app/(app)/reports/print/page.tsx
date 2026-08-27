'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

type ReminderItem = {
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

const dateFmt = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

function ReminderTable({ title, items }: { title: string; items: ReminderItem[] }) {
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Tidak ada data.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-1.5 pr-2">Kode</th>
              <th className="text-left py-1.5 pr-2">Project</th>
              <th className="text-left py-1.5 pr-2">Termin</th>
              <th className="text-left py-1.5 pr-2">Dokumen Ditunggu</th>
              <th className="text-left py-1.5 pr-2">Jatuh Tempo</th>
              <th className="text-left py-1.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.termin_id}-${item.doc_type}`} className="border-b">
                <td className="py-1.5 pr-2 font-mono text-xs">{item.project_code ?? '-'}</td>
                <td className="py-1.5 pr-2">{item.project_name}</td>
                <td className="py-1.5 pr-2">{item.termin_name ?? `Termin #${item.termin_id}`}</td>
                <td className="py-1.5 pr-2">{item.doc_label ?? item.doc_type}</td>
                <td className="py-1.5 pr-2">{dateFmt.format(new Date(item.due_date))}</td>
                <td className="py-1.5">
                  {item.days_overdue > 0 ? `Terlambat ${item.days_overdue} hari` : `${item.days_until_due} hari lagi`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function ReportPrintPage() {
  const token = useAuthStore((s) => s.access_token);

  const { data: overdue, isLoading: loadingOverdue } = useQuery({
    queryKey: ['report-print', 'overdue'],
    queryFn: () =>
      apiFetch<RemindersResponse>('/dashboard/reminders?tab=overdue&page=1&per_page=1000', {
        token: token ?? undefined,
      }),
    enabled: !!token,
  });

  const { data: pending, isLoading: loadingPending } = useQuery({
    queryKey: ['report-print', 'pending'],
    queryFn: () =>
      apiFetch<RemindersResponse>('/dashboard/reminders?tab=pending&page=1&per_page=1000', {
        token: token ?? undefined,
      }),
    enabled: !!token,
  });

  const isLoading = loadingOverdue || loadingPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-semibold">Print — Status Pekerjaan & Dokumen</h1>
          <p className="text-sm text-muted-foreground">Daftar termin overdue & pending yang butuh tindak lanjut.</p>
        </div>
        <Button onClick={() => window.print()}>Print</Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="space-y-8">
          <ReminderTable title="Overdue" items={overdue?.items ?? []} />
          <ReminderTable title="Pending" items={pending?.items ?? []} />
        </div>
      )}
    </div>
  );
}
