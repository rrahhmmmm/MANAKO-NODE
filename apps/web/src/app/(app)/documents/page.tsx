'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DocTypeForm,
  DOC_TYPE_STAGES,
  type DocType,
  type DocTypeFormValues,
  type DocTypeStage,
} from '@/components/forms/DocTypeForm';

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.access_token);
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role === 'admin';

  const [stage, setStage] = useState<DocTypeStage | 'all'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DocType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocType | null>(null);
  const [deleting, setDeleting] = useState(false);

  const queryKey = ['doc-types', stage] as const;

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => {
      const qs = stage !== 'all' ? `?stage=${stage}` : '';
      return apiFetch<DocType[]>(`/doc-types${qs}`, { token: token ?? undefined });
    },
    enabled: !!token,
  });

  function openCreate() {
    setEditing(null);
    setSubmitError(null);
    setFormOpen(true);
  }

  function openEdit(docType: DocType) {
    setEditing(docType);
    setSubmitError(null);
    setFormOpen(true);
  }

  async function handleSubmit(values: DocTypeFormValues) {
    setSubmitError(null);
    setSubmitting(true);
    try {
      if (editing) {
        await apiFetch<DocType>(`/doc-types/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            label: values.label,
            stage: values.stage,
            required: values.required,
            priority: values.priority,
          }),
          token: token ?? undefined,
        });
        toast.success('Doc type diperbarui');
      } else {
        await apiFetch<DocType>('/doc-types', {
          method: 'POST',
          body: JSON.stringify(values),
          token: token ?? undefined,
        });
        toast.success('Doc type dibuat');
      }
      setFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ['doc-types'] });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'KEYNAME_TAKEN') {
        setSubmitError('Keyname sudah dipakai doc type lain');
      } else {
        setSubmitError((err as Error).message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleRequired(docType: DocType) {
    const prev = queryClient.getQueryData<DocType[]>(queryKey);
    queryClient.setQueryData<DocType[]>(queryKey, (rows) =>
      rows?.map((r) => (r.id === docType.id ? { ...r, required: !r.required } : r)),
    );
    try {
      await apiFetch(`/doc-types/${docType.id}/toggle-required`, {
        method: 'POST',
        token: token ?? undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['doc-types'] });
    } catch (err) {
      queryClient.setQueryData(queryKey, prev);
      toast.error((err as Error).message);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/doc-types/${deleteTarget.id}`, { method: 'DELETE', token: token ?? undefined });
      toast.success('Doc type dihapus');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['doc-types'] });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'DOC_TYPE_IN_USE') {
        toast.error('Doc type masih dipakai oleh dokumen yang sudah diupload');
      } else {
        toast.error((err as Error).message);
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Master Dokumen</h1>
          <p className="text-sm text-muted-foreground">Katalog jenis dokumen per stage project.</p>
        </div>
        {isAdmin && <Button onClick={openCreate}>+ Tambah Doc Type</Button>}
      </div>

      <div className="flex gap-3">
        <Select value={stage} onValueChange={(v) => setStage(v as DocTypeStage | 'all')}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Semua stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua stage</SelectItem>
            {DOC_TYPE_STAGES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
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
              <TableHead>Keyname</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Wajib</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {data?.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-mono text-xs">{d.keyname ?? '-'}</TableCell>
                <TableCell>{d.label ?? '-'}</TableCell>
                <TableCell>
                  <Badge variant="outline">{d.stage}</Badge>
                </TableCell>
                <TableCell>{d.priority}</TableCell>
                <TableCell>
                  <Switch
                    checked={d.required}
                    onCheckedChange={() => handleToggleRequired(d)}
                    disabled={!isAdmin}
                  />
                </TableCell>
                <TableCell>
                  {isAdmin && (
                    <div className="flex gap-3">
                      <button
                        className="text-primary text-sm hover:underline"
                        onClick={() => openEdit(d)}
                      >
                        Edit
                      </button>
                      <button
                        className="text-destructive text-sm hover:underline"
                        onClick={() => setDeleteTarget(d)}
                      >
                        Hapus
                      </button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Tidak ada doc type.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.label}` : 'Tambah Doc Type'}</DialogTitle>
          </DialogHeader>
          <DocTypeForm
            mode={editing ? 'edit' : 'create'}
            defaultDocType={editing ?? undefined}
            onSubmit={handleSubmit}
            submitting={submitting}
            submitError={submitError}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus {deleteTarget?.label}?</DialogTitle>
            <DialogDescription>
              Doc type yang sudah dipakai dokumen yang diupload tidak bisa dihapus.
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
  );
}
