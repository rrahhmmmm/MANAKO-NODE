'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { apiFetch, apiFetchBlob } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { UploadDocModal } from './UploadDocModal';

export type ChecklistEntry = {
  doc_type: string;
  label: string | null;
  required: boolean;
  bypass_check: boolean;
  uploaded: boolean;
  termin_document_id?: number;
  file_path?: string;
  uploaded_at?: string;
  custom_label?: string | null;
  status?: number;
};

const dateFmt = (v?: string) => (v ? new Intl.DateTimeFormat('id-ID').format(new Date(v)) : '-');

export function DocChecklistItem({
  entry,
  terminId,
  isAdmin,
  onToggleBypass,
  onChanged,
}: {
  entry: ChecklistEntry;
  terminId: number;
  isAdmin: boolean;
  onToggleBypass: () => void;
  onChanged: () => void;
}) {
  const token = useAuthStore((s) => s.access_token);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handlePreview() {
    if (!entry.termin_document_id) return;
    setPreviewing(true);
    try {
      const blob = await apiFetchBlob(`/termin-documents/${entry.termin_document_id}/file`, token ?? undefined);
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
    if (!entry.termin_document_id) return;
    setDeleting(true);
    try {
      await apiFetch(`/termin-documents/${entry.termin_document_id}`, {
        method: 'DELETE',
        token: token ?? undefined,
      });
      toast.success('Dokumen dihapus');
      onChanged();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  const isTtb = entry.doc_type === 'TTB';
  const statusLabel = entry.bypass_check
    ? 'Bypass'
    : entry.uploaded
      ? 'Terupload'
      : 'Belum';
  const statusVariant: 'default' | 'secondary' | 'outline' = entry.bypass_check
    ? 'secondary'
    : entry.uploaded
      ? 'default'
      : 'outline';

  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{entry.label ?? entry.doc_type}</span>
          <Badge variant={statusVariant}>{isTtb && entry.custom_label ? entry.custom_label : statusLabel}</Badge>
        </div>
        {entry.uploaded && (
          <p className="text-xs text-muted-foreground">Diupload {dateFmt(entry.uploaded_at)}</p>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {isAdmin && (
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Bypass
            <Switch checked={entry.bypass_check} onCheckedChange={onToggleBypass} />
          </label>
        )}

        {entry.uploaded ? (
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

      <UploadDocModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        terminId={terminId}
        docType={entry.doc_type}
        isTtb={isTtb}
        onUploaded={onChanged}
      />
    </div>
  );
}
