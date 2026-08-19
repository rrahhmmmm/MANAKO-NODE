'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ALL = 'all';

export function YearFilter({
  year,
  onChange,
}: {
  year: number | undefined;
  onChange: (year: number | undefined) => void;
}) {
  const token = useAuthStore((s) => s.access_token);
  const { data } = useQuery({
    queryKey: ['report-years'],
    queryFn: () => apiFetch<number[]>('/reports/years', { token: token ?? undefined }),
    enabled: !!token,
  });

  const value = year ? String(year) : ALL;

  return (
    <Select value={value} onValueChange={(v) => onChange(v === ALL ? undefined : Number(v))}>
      <SelectTrigger className="w-32">
        <SelectValue placeholder="Semua tahun">{(v: string) => (v === ALL ? 'Semua tahun' : v)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>Semua tahun</SelectItem>
        {data?.map((y) => (
          <SelectItem key={y} value={String(y)}>
            {y}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
