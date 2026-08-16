'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { UserForm, type User, type UserFormValues } from '@/components/forms/UserForm';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.access_token);
  const currentUser = useAuthStore((s) => s.user);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') router.replace('/dashboard');
  }, [currentUser, router]);

  const { data: user, isLoading } = useQuery({
    queryKey: ['user', params.id],
    queryFn: () => apiFetch<User>(`/users/${params.id}`, { token: token ?? undefined }),
    enabled: !!token && currentUser?.role === 'admin',
  });

  if (currentUser && currentUser.role !== 'admin') return null;

  async function handleSubmit(values: UserFormValues) {
    setSubmitError(null);
    setSubmitting(true);
    try {
      await apiFetch<User>(`/users/${params.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          phone: values.phone || null,
          role: values.role,
          ...(values.password ? { password: values.password } : {}),
        }),
        token: token ?? undefined,
      });
      toast.success('Perubahan disimpan');
      queryClient.invalidateQueries({ queryKey: ['user', params.id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EMAIL_TAKEN') {
        setSubmitError('Email sudah dipakai oleh user lain');
      } else {
        setSubmitError((err as Error).message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await apiFetch(`/users/${params.id}`, { method: 'DELETE', token: token ?? undefined });
      toast.success('User dihapus');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      router.push('/users');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  if (isLoading || !user) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">{user.name}</h1>
        <p className="text-sm text-muted-foreground">Detail & role assignment.</p>
      </div>

      <UserForm
        mode="edit"
        defaultUser={user}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitError={submitError}
      />

      <div className="border-t pt-6 max-w-md">
        <h2 className="text-sm font-medium mb-2">Zona Berbahaya</h2>
        <Dialog>
          <DialogTrigger render={<Button variant="destructive" />}>Hapus User</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Hapus {user.name}?</DialogTitle>
              <DialogDescription>
                User tidak bisa login lagi setelah dihapus. Tindakan ini tidak sepenuhnya bisa
                dibatalkan dari UI.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Batal</DialogClose>
              <Button variant="destructive" disabled={deleting} onClick={handleDelete}>
                {deleting ? 'Menghapus…' : 'Ya, hapus'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
