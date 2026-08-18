'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import type { Project } from '@/components/forms/ProjectForm';
import { ProjectStatusBadge } from '@/components/features/projects/ProjectStatusBadge';
import { TerminAccordion } from '@/components/features/termins/TerminAccordion';
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

const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const dateFmt = (v: string | null) => (v ? new Intl.DateTimeFormat('id-ID').format(new Date(v)) : '-');

const CONTRACT_TYPE_LABEL: Record<string, string> = { new: 'Baru', renewal: 'Renewal' };
const CLASSIFICATION_LABEL: Record<string, string> = { rutin: 'Rutin', non_rutin: 'Non Rutin' };

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.access_token);
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role === 'admin';
  const [deleting, setDeleting] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', params.id],
    queryFn: () => apiFetch<Project>(`/projects/${params.id}`, { token: token ?? undefined }),
    enabled: !!token,
  });

  async function handleDelete() {
    setDeleting(true);
    try {
      await apiFetch(`/projects/${params.id}`, { method: 'DELETE', token: token ?? undefined });
      toast.success('Project dihapus');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      router.push('/projects');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  if (isLoading || !project) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            <ProjectStatusBadge status={project.status} />
          </div>
          <p className="text-sm text-muted-foreground font-mono">{project.code ?? '-'}</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" render={<Link href={`/projects/${project.id}/edit`} />}>
              Edit
            </Button>
            <Dialog>
              <DialogTrigger render={<Button variant="destructive" />}>Hapus</DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Hapus {project.name}?</DialogTitle>
                  <DialogDescription>
                    Termins & dokumen yang terkait project ini akan ikut terhapus.
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
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm max-w-2xl">
        <div>
          <dt className="text-muted-foreground">Vendor</dt>
          <dd>{project.vendor?.name ?? '-'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Nilai Kontrak</dt>
          <dd>{rupiah.format(Number(project.value))}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">PIC IKT</dt>
          <dd>{project.pic_ikt?.name ?? '-'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">PIC Vendor</dt>
          <dd>{project.pic_vendor?.name ?? '-'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Tanggal Mulai</dt>
          <dd>{dateFmt(project.start_date)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Tanggal Selesai</dt>
          <dd>{dateFmt(project.end_date)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Klasifikasi</dt>
          <dd>{project.classification ? CLASSIFICATION_LABEL[project.classification] : '-'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Tipe Kontrak</dt>
          <dd>{CONTRACT_TYPE_LABEL[project.contract_type]}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">No. Kontrak</dt>
          <dd>{project.no_kontrak ?? '-'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Progress</dt>
          <dd>{Number(project.progress_percent).toFixed(0)}%</dd>
        </div>
      </div>

      {project.description && (
        <div className="max-w-2xl">
          <h2 className="text-sm font-medium text-muted-foreground mb-1">Deskripsi</h2>
          <p className="text-sm whitespace-pre-wrap">{project.description}</p>
        </div>
      )}

      <TerminAccordion projectId={project.id} projectValue={project.value} projectStartDate={project.start_date} />
    </div>
  );
}
