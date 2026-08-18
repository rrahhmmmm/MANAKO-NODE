'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { VendorForm, type Vendor, type VendorFormValues } from '@/components/forms/VendorForm';
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

export default function VendorDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.access_token);
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role === 'admin';
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: vendor, isLoading } = useQuery({
    queryKey: ['vendor', params.id],
    queryFn: () => apiFetch<Vendor>(`/vendors/${params.id}`, { token: token ?? undefined }),
    enabled: !!token,
  });

  async function handleSubmit(values: VendorFormValues) {
    setSubmitError(null);
    setSubmitting(true);
    try {
      await apiFetch<Vendor>(`/vendors/${params.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: values.name,
          contact_name: values.contact_name || null,
          contact_phone: values.contact_phone || null,
          contact_email: values.contact_email || null,
          npwp: values.npwp || null,
        }),
        token: token ?? undefined,
      });
      toast.success('Perubahan disimpan');
      queryClient.invalidateQueries({ queryKey: ['vendor', params.id] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await apiFetch(`/vendors/${params.id}`, { method: 'DELETE', token: token ?? undefined });
      toast.success('Vendor dihapus');
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      router.push('/vendors');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  if (isLoading || !vendor) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6 max-w-md">
        <div>
          <h1 className="text-2xl font-semibold">{vendor.name}</h1>
          <p className="text-sm text-muted-foreground">Detail vendor.</p>
        </div>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Nama Kontak</dt>
            <dd>{vendor.contact_name ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Telepon Kontak</dt>
            <dd>{vendor.contact_phone ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Email Kontak</dt>
            <dd>{vendor.contact_email ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">NPWP</dt>
            <dd>{vendor.npwp ?? '-'}</dd>
          </div>
        </dl>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">{vendor.name}</h1>
        <p className="text-sm text-muted-foreground">Detail & kontak vendor.</p>
      </div>

      <VendorForm
        mode="edit"
        defaultVendor={vendor}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitError={submitError}
      />

      <div className="border-t pt-6 max-w-md">
        <h2 className="text-sm font-medium mb-2">Zona Berbahaya</h2>
        <Dialog>
          <DialogTrigger render={<Button variant="destructive" />}>Hapus Vendor</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Hapus {vendor.name}?</DialogTitle>
              <DialogDescription>
                Project yang terkait vendor ini tidak ikut terhapus, hanya referensi vendor-nya
                dikosongkan.
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
