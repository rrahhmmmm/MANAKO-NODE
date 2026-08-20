'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch, apiFetchBlob } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { UploadInitDocModal } from './UploadInitDocModal';

export type InitiationDocument = {
  id: number;
  project_id: number;
  doc_type: string;
  file_path: string;
  uploaded_at: string;
  no_document: string | null;
  doc_name: string | null;
  created_at: string;
};

const SINGLE_DOC_TYPES: { doc_type: string; label: string }[] = [
  { doc_type: 'ND_IJIN_PRINSIP', label: 'Nota Dinas Izin Prinsip' },
  { doc_type: 'KONTRAK', label: 'Dokumen Kontrak' },
  { doc_type: 'RKS', label: 'Dokumen RKS' },
  { doc_type: 'RAB', label: 'Dokumen RAB' },
  { doc_type: 'HIRADC', label: 'HiraDC' },
  { doc_type: 'EVATEK', label: 'Evatek' },
  { doc_type: 'JUSTIFIKASI', label: 'Justifikasi' },
  { doc_type: 'TKDN', label: 'TKDN' },
  { doc_type: 'BAMK', label: 'BAMK (Berita Acara Mulai Kerja)' },
];

const dateFmt = (v?: string) => (v ? new Intl.DateTimeFormat('id-ID').format(new Date(v)) : '-');

function InitDocRow({
  docType,
  label,
  doc,
  projectId,
  isAdmin,
  onChanged,
}: {
  docType: string;
  label: string;
  doc: InitiationDocument | undefined;
  projectId: number;
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const token = useAuthStore((s) => s.access_token);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handlePreview() {
    if (!doc) return;
    setPreviewing(true);
    try {
      const blob = await apiFetchBlob(`/init-documents/${doc.id}/file`, token ?? undefined);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPreviewing(false);
    }
  }

  async function handleDelete() {
    if (!doc) return;
    setDeleting(true);
    try {
      await apiFetch(`/init-documents/${doc.id}`, { method: 'DELETE', token: token ?? undefined });
      toast.success('Dokumen dihapus');
      onChanged();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{label}</span>
          <Badge variant={doc ? 'default' : 'outline'}>{doc ? 'Terupload' : 'Belum'}</Badge>
        </div>
        {doc && (
          <p className="text-xs text-muted-foreground">
            Diupload {dateFmt(doc.uploaded_at)}
            {doc.no_document ? ` · No. ${doc.no_document}` : ''}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {doc ? (
          <>
            <Button variant="outline" size="sm" disabled={previewing} onClick={handlePreview}>
              {previewing ? 'Membuka…' : 'Lihat'}
            </Button>
            {isAdmin && (
              <Button variant="ghost" size="sm" disabled={deleting} onClick={handleDelete} className="text-destructive">
                {deleting ? 'Menghapus…' : 'Hapus'}
              </Button>
            )}
          </>
        ) : (
          isAdmin && (
            <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
              Upload
            </Button>
          )
        )}
      </div>

      <UploadInitDocModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        projectId={projectId}
        docType={docType}
        docLabel={label}
        onUploaded={onChanged}
      />
    </div>
  );
}

export function InitDocsPanel({
  projectId,
  isAdmin,
  onChanged,
}: {
  projectId: number;
  isAdmin: boolean;
  /** Dipanggil setiap upload/hapus dokumen inisiasi — upload BAMK bisa mengubah status project (inisiasi→running), jadi parent perlu invalidate query project juga. */
  onChanged?: () => void;
}) {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.access_token);
  const queryKey = ['init-documents', projectId] as const;

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => apiFetch<InitiationDocument[]>(`/projects/${projectId}/init-documents`, { token: token ?? undefined }),
    enabled: !!token,
  });

  function refetch() {
    queryClient.invalidateQueries({ queryKey });
    onChanged?.();
  }

  const byDocType = new Map((data ?? []).map((d) => [d.doc_type, d]));
  const prPoCount = (data ?? []).filter((d) => d.doc_type === 'PR' || d.doc_type === 'PO').length;

  return (
    <div className="space-y-3">
      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      )}

      {!isLoading &&
        SINGLE_DOC_TYPES.map(({ doc_type, label }) => (
          <InitDocRow
            key={doc_type}
            docType={doc_type}
            label={label}
            doc={byDocType.get(doc_type)}
            projectId={projectId}
            isAdmin={isAdmin}
            onChanged={refetch}
          />
        ))}

      {!isLoading && (
        <div className="flex items-center justify-between py-2.5 border-t text-sm">
          <span className="text-muted-foreground">
            PR / PO ({prPoCount} dokumen) — kelola di tab &quot;PR / PO&quot;
          </span>
        </div>
      )}
    </div>
  );
}
