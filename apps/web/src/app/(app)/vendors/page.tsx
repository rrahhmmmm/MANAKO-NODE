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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Vendor } from '@/components/forms/VendorForm';

export default function VendorsPage() {
  const token = useAuthStore((s) => s.access_token);
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role === 'admin';
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['vendors', search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const qs = params.toString();
      return apiFetch<Vendor[]>(`/vendors${qs ? `?${qs}` : ''}`, { token: token ?? undefined });
    },
    enabled: !!token,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Master Vendor</h1>
          <p className="text-sm text-muted-foreground">Kelola data vendor & kontak.</p>
        </div>
        {isAdmin && <Button render={<Link href="/vendors/new" />}>+ Tambah Vendor</Button>}
      </div>

      <div className="flex gap-3">
        <Input
          placeholder="Cari nama vendor…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {error && <div className="text-destructive text-sm">{(error as Error).message}</div>}

      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Kontak</TableHead>
              <TableHead>Telepon</TableHead>
              <TableHead>NPWP</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {data?.map((v) => (
              <TableRow key={v.id}>
                <TableCell>{v.name}</TableCell>
                <TableCell>{v.contact_name ?? '-'}</TableCell>
                <TableCell>{v.contact_phone ?? '-'}</TableCell>
                <TableCell>{v.npwp ?? '-'}</TableCell>
                <TableCell>
                  <Link href={`/vendors/${v.id}`} className="text-primary text-sm hover:underline">
                    Detail
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Tidak ada vendor.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
