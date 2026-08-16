'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { UserForm, type User, type UserFormValues } from '@/components/forms/UserForm';

export default function NewUserPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.access_token);
  const currentUser = useAuthStore((s) => s.user);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') router.replace('/dashboard');
  }, [currentUser, router]);

  if (currentUser && currentUser.role !== 'admin') return null;

  async function handleSubmit(values: UserFormValues) {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const user = await apiFetch<User>('/users', {
        method: 'POST',
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          phone: values.phone || undefined,
          role: values.role,
          password: values.password,
        }),
        token: token ?? undefined,
      });
      toast.success('User berhasil dibuat');
      router.push(`/users/${user.id}`);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tambah User</h1>
        <p className="text-sm text-muted-foreground">Buat akun internal baru.</p>
      </div>
      <UserForm mode="create" onSubmit={handleSubmit} submitting={submitting} submitError={submitError} />
    </div>
  );
}
