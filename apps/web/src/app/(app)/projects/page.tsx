'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ProjectStatusBadge, type ProjectStatus } from '@/components/features/projects/ProjectStatusBadge';
import type { ClassificationType, ProjectListItem } from '@/components/forms/ProjectForm';

const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

const STATUS_OPTIONS: ProjectStatus[] = ['inisiasi', 'running', 'completed', 'closed', 'cancelled'];
const STATUS_LABEL: Record<ProjectStatus, string> = {
  inisiasi: 'Inisiasi',
  running: 'Running',
  completed: 'Completed',
  closed: 'Closed',
  cancelled: 'Cancelled',
};
const CLASSIFICATION_LABEL: Record<ClassificationType, string> = { rutin: 'Rutin', non_rutin: 'Non Rutin' };

type ProjectsResponse = { items: ProjectListItem[]; total: number; page: number; per_page: number };

export default function ProjectsPage() {
  const token = useAuthStore((s) => s.access_token);
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role === 'admin';

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProjectStatus | 'all'>('all');
  const [classification, setClassification] = useState<ClassificationType | 'all'>('all');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['projects', search, status, classification, page],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status !== 'all') params.set('status', status);
      if (classification !== 'all') params.set('classification', classification);
      params.set('page', String(page));
      return apiFetch<ProjectsResponse>(`/projects?${params.toString()}`, { token: token ?? undefined });
    },
    enabled: !!token,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.per_page)) : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground">Kelola project & kontrak vendor.</p>
        </div>
        {isAdmin && <Button render={<Link href="/projects/new" />}>+ Tambah Project</Button>}
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Cari kode / nama project…"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          className="max-w-xs"
        />
        <Select
          value={status}
          onValueChange={(v) => {
            setPage(1);
            setStatus(v as ProjectStatus | 'all');
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Semua status">
              {(v: ProjectStatus | 'all') => (v === 'all' ? 'Semua status' : STATUS_LABEL[v])}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={classification}
          onValueChange={(v) => {
            setPage(1);
            setClassification(v as ClassificationType | 'all');
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Semua klasifikasi">
              {(v: ClassificationType | 'all') => (v === 'all' ? 'Semua klasifikasi' : CLASSIFICATION_LABEL[v])}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua klasifikasi</SelectItem>
            <SelectItem value="rutin">Rutin</SelectItem>
            <SelectItem value="non_rutin">Non Rutin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && <div className="text-destructive text-sm">{(error as Error).message}</div>}

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
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
