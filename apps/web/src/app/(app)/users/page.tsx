'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { USER_ROLES, type User, type UserRole } from '@/components/forms/UserForm';

export default function UsersPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.access_token);
  const currentUser = useAuthStore((s) => s.user);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<UserRole | 'all'>('all');

  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') router.replace('/dashboard');
  }, [currentUser, router]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['users', role, search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (role !== 'all') params.set('role', role);
      if (search) params.set('search', search);
      const qs = params.toString();
      return apiFetch<User[]>(`/users${qs ? `?${qs}` : ''}`, { token: token ?? undefined });
    },
    enabled: !!token && currentUser?.role === 'admin',
  });

  if (currentUser && currentUser.role !== 'admin') return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground">Kelola akun internal & role akses.</p>
        </div>
        <Button render={<Link href="/users/new" />}>+ Tambah User</Button>
      </div>

      <div className="flex gap-3">
        <Input
          placeholder="Cari nama/email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={role} onValueChange={(v) => setRole(v as UserRole | 'all')}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Semua role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua role</SelectItem>
            {USER_ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <div className="text-destructive text-sm">{(error as Error).message}</div>}

      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telepon</TableHead>
              <TableHead>Role</TableHead>
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
            {data?.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.phone ?? '-'}</TableCell>
                <TableCell>
                  <Badge variant="outline">{u.role}</Badge>
                </TableCell>
                <TableCell>
                  <Link href={`/users/${u.id}`} className="text-primary text-sm hover:underline">
                    Detail
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Tidak ada user.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
