'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TerminFormModal } from './TerminFormModal';
import { TerminDocsPanel } from './TerminDocsPanel';
import { TERMIN_TYPE_LABEL, type Termin } from '@/components/forms/TerminForm';

const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const dateFmt = (v: string | null) => (v ? new Intl.DateTimeFormat('id-ID').format(new Date(v)) : '-');

export function TerminAccordion({
  projectId,
  projectValue,
  projectStartDate,
}: {
  projectId: number;
  projectValue: string;
  projectStartDate?: string | null;
}) {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.access_token);
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role === 'admin';
  const queryKey = ['project-termins', projectId] as const;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Termin | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Termin | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [needsForce, setNeedsForce] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => apiFetch<Termin[]>(`/projects/${projectId}/termins`, { token: token ?? undefined }),
    enabled: !!token,
  });

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(t: Termin) {
    setEditing(t);
    setFormOpen(true);
  }

  function openDelete(t: Termin) {
    setDeleteTarget(t);
    setNeedsForce(false);
  }

  async function handleDelete(force: boolean) {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/termins/${deleteTarget.id}${force ? '?force=true' : ''}`, {
        method: 'DELETE',
        token: token ?? undefined,
      });
      toast.success('Termin dihapus');
      setDeleteTarget(null);
      setNeedsForce(false);
      queryClient.invalidateQueries({ queryKey });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'HAS_DOCUMENTS') {
        setNeedsForce(true);
      } else {
        toast.error((err as Error).message);
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Termins</h2>
        {isAdmin && <Button size="sm" onClick={openCreate}>+ Tambah Termin</Button>}
      </div>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {!isLoading && data?.length === 0 && (
        <p className="text-sm text-muted-foreground">Belum ada termin untuk project ini.</p>
      )}

      {!isLoading && data && data.length > 0 && (
        <Accordion className="border rounded-xl px-4">
          {data.map((t) => (
            <AccordionItem key={t.id} value={String(t.id)}>
              <AccordionTrigger>
                <div className="flex flex-1 items-center justify-between pr-4">
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="font-medium">{t.name ?? `Termin ${t.order_index}`}</span>
                    <span className="text-xs text-muted-foreground">
                      {TERMIN_TYPE_LABEL[t.type]} · {dateFmt(t.period_start)} – {dateFmt(t.period_end)} ·{' '}
                      {Number(t.percentage)}% · {rupiah.format(Number(t.amount ?? 0))} · jatuh tempo {dateFmt(t.due_date)}
                    </span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {isAdmin && (
                  <div className="flex gap-3 pb-3">
                    <button
                      className="text-primary text-sm hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(t);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="text-destructive text-sm hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDelete(t);
                      }}
                    >
                      Hapus
                    </button>
                  </div>
                )}
                <TerminDocsPanel terminId={t.id} isAdmin={isAdmin} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      <TerminFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        projectId={projectId}
        projectValue={projectValue}
        projectStartDate={projectStartDate}
        termin={editing}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus {deleteTarget?.name}?</DialogTitle>
            <DialogDescription>
              {needsForce
                ? 'Termin ini masih memiliki dokumen yang sudah diupload. Hapus paksa akan ikut menghapus semua dokumennya.'
                : 'Tindakan ini tidak bisa dibatalkan.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Batal</DialogClose>
            <Button variant="destructive" disabled={deleting} onClick={() => handleDelete(needsForce)}>
              {deleting ? 'Menghapus…' : needsForce ? 'Ya, hapus paksa' : 'Ya, hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
