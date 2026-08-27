'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch, apiFetchBlobWithFilename } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { downloadBlob } from '@/lib/download';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportPreviewTable, type ReportColumn, type ReportRow } from '@/components/features/reports/ReportPreviewTable';

type PreviewResponse = { columns: ReportColumn[]; rows: ReportRow[] };

export default function ReportPreviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useAuthStore((s) => s.access_token);
  const [downloading, setDownloading] = useState(false);

  const year = searchParams.get('year');
  const classification = searchParams.get('classification') ?? 'rutin';

  const { data, isLoading, error } = useQuery({
    queryKey: ['report-preview', year, classification],
    queryFn: () =>
      apiFetch<PreviewResponse>(`/reports/preview?year=${year}&classification=${classification}`, {
        token: token ?? undefined,
      }),
    enabled: !!token && !!year,
  });

  async function handleDownload() {
    if (!year) return;
    setDownloading(true);
    try {
      const { blob, filename } = await apiFetchBlobWithFilename(
        `/reports/export.xlsx?year=${year}&classification=${classification}`,
        token ?? undefined,
      );
      downloadBlob(blob, filename ?? `Laporan_${classification}.xlsx`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDownloading(false);
    }
  }

  if (!year) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Pilih tahun & klasifikasi terlebih dahulu.</p>
        <Button variant="outline" onClick={() => router.push('/reports')}>
          Kembali ke Reports
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Preview Laporan</h1>
          <p className="text-sm text-muted-foreground">
            Tahun {year} · {classification === 'rutin' ? 'Rutin' : 'Non Rutin'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={downloading} onClick={handleDownload}>
            {downloading ? 'Mengunduh…' : 'Download Excel'}
          </Button>
          <Button variant="outline" onClick={() => router.push('/reports/print')}>
            Print
          </Button>
        </div>
      </div>

      {isLoading && <Skeleton className="h-64 w-full" />}
      {error && <div className="text-destructive text-sm">{(error as Error).message}</div>}
      {data && <ReportPreviewTable columns={data.columns} rows={data.rows} />}
    </div>
  );
}
