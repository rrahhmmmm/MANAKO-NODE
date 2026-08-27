'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { YearFilter } from '@/components/features/dashboard/YearFilter';
import { apiFetchBlobWithFilename } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { downloadBlob } from '@/lib/download';

export type Classification = 'rutin' | 'non_rutin';

export function ReportGenerateForm() {
  const router = useRouter();
  const token = useAuthStore((s) => s.access_token);
  const [year, setYear] = useState<number | undefined>(undefined);
  const [classification, setClassification] = useState<Classification>('rutin');
  const [downloading, setDownloading] = useState(false);

  function buildQuery() {
    return new URLSearchParams({ year: String(year), classification }).toString();
  }

  function handlePreview() {
    if (!year) return toast.error('Pilih tahun terlebih dahulu');
    router.push(`/reports/preview?${buildQuery()}`);
  }

  async function handleDownload() {
    if (!year) return toast.error('Pilih tahun terlebih dahulu');
    setDownloading(true);
    try {
      const { blob, filename } = await apiFetchBlobWithFilename(
        `/reports/export.xlsx?${buildQuery()}`,
        token ?? undefined,
      );
      downloadBlob(blob, filename ?? `Laporan_${classification}.xlsx`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div className="space-y-2">
        <label className="text-sm font-medium">Tahun</label>
        <YearFilter year={year} onChange={setYear} />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Klasifikasi</label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={classification === 'rutin' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setClassification('rutin')}
          >
            Rutin
          </Button>
          <Button
            type="button"
            variant={classification === 'non_rutin' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setClassification('non_rutin')}
          >
            Non Rutin
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={handlePreview}>Preview</Button>
        <Button variant="outline" disabled={downloading} onClick={handleDownload}>
          {downloading ? 'Mengunduh…' : 'Download Excel'}
        </Button>
        <Button variant="outline" onClick={() => router.push('/reports/print')}>
          Print
        </Button>
      </div>
    </div>
  );
}
