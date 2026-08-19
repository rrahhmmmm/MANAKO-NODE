'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ProjectStatusBadge } from '@/components/features/projects/ProjectStatusBadge';
import type { ProjectListItem } from '@/components/forms/ProjectForm';
import type { ProjectFiltersState } from './ProjectFilters';

const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

type DashboardProjectsResponse = { items: ProjectListItem[]; total: number; page: number; per_page: number };

export function ProjectList({ filters, year }: { filters: ProjectFiltersState; year: number | undefined }) {
  const token = useAuthStore((s) => s.access_token);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [filters.tab, filters.search, filters.classification.join(','), year]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-projects', filters, year, page],
    queryFn: () => {
      const params = new URLSearchParams({ tab: filters.tab, page: String(page) });
      if (filters.search) params.set('search', filters.search);
      if (year) params.set('year', String(year));
      for (const c of filters.classification) params.append('classification', c);
      return apiFetch<DashboardProjectsResponse>(`/dashboard/projects?${params.toString()}`, {
        token: token ?? undefined,
      });
    },
    enabled: !!token,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.per_page)) : 1;

  return (
    <div className="space-y-4">
      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Nilai</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {error && (
              <TableRow>
                <TableCell colSpan={7} className="text-destructive text-sm py-4">
                  {(error as Error).message}
                </TableCell>
              </TableRow>
            )}
            {data?.items.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs">{p.code ?? '-'}</TableCell>
                <TableCell>{p.name}</TableCell>
                <TableCell>{p.vendor?.name ?? '-'}</TableCell>
                <TableCell>
                  <ProjectStatusBadge status={p.status} />
                </TableCell>
                <TableCell>{rupiah.format(Number(p.value))}</TableCell>
                <TableCell>{Number(p.progress_percent).toFixed(0)}%</TableCell>
                <TableCell>
                  <Link href={`/projects/${p.id}`} className="text-primary text-sm hover:underline">
                    Detail
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Tidak ada project.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {data && data.total > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Halaman {data.page} dari {totalPages} ({data.total} project)
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
