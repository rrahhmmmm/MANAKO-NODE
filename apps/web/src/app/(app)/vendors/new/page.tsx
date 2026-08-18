'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { VendorForm, type Vendor, type VendorFormValues } from '@/components/forms/VendorForm';

export default function NewVendorPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.access_token);
  const currentUser = useAuthStore((s) => s.user);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') router.replace('/vendors');
  }, [currentUser, router]);

  if (currentUser && currentUser.role !== 'admin') return null;

  async function handleSubmit(values: VendorFormValues) {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const vendor = await apiFetch<Vendor>('/vendors', {
        method: 'POST',
        body: JSON.stringify({
          name: values.name,
          contact_name: values.contact_name || undefined,
          contact_phone: values.contact_phone || undefined,
          contact_email: values.contact_email || undefined,
          npwp: values.npwp || undefined,
        }),
        token: token ?? undefined,
      });
      toast.success('Vendor berhasil dibuat');
      router.push(`/vendors/${vendor.id}`);
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tambah Vendor</h1>
        <p className="text-sm text-muted-foreground">Daftarkan vendor baru.</p>
      </div>
      <VendorForm mode="create" onSubmit={handleSubmit} submitting={submitting} submitError={submitError} />
    </div>
  );
}
