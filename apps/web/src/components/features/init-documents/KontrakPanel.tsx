'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { apiFetch, apiFetchBlob } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Project } from '@/components/forms/ProjectForm';

const ALLOWED_EXTS = ['pdf', 'doc', 'docx'];
const MAX_UPLOAD_MB = 25;

export function KontrakPanel({
  project,
  isAdmin,
  onChanged,
}: {
  project: Project;
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const token = useAuthStore((s) => s.access_token);
  const [file, setFile] = useState<File | null>(null);
  const [noKontrak, setNoKontrak] = useState(project.no_kontrak ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setError(null);
    if (f) {
      const ext = f.name.split('.').pop()?.toLowerCase();
      if (!ext || !ALLOWED_EXTS.includes(ext)) {
        setError(`Tipe file tidak diizinkan. Hanya: ${ALLOWED_EXTS.join(', ')}`);
        setFile(null);
        return;
      }
      if (f.size > MAX_UPLOAD_MB * 1024 * 1024) {
        setError(`Ukuran file maksimal ${MAX_UPLOAD_MB}MB`);
        setFile(null);
        return;
      }
    }
    setFile(f);
  }

  async function handleUpload() {
    if (!file) {
      setError('Pilih file terlebih dahulu');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const formData = new FormData();
      if (noKontrak.trim()) formData.append('no_kontrak', noKontrak.trim());
      formData.append('file', file);

      await apiFetch(`/projects/${project.id}/contract`, { method: 'POST', body: formData, token: token ?? undefined });
      toast.success('Kontrak diupload');
      setFile(null);
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePreview() {
    setPreviewing(true);
    try {
      const blob = await apiFetchBlob(`/projects/${project.id}/contract/file`, token ?? undefined);
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
    setDeleting(true);
    try {
      await apiFetch(`/projects/${project.id}/contract`, { method: 'DELETE', token: token ?? undefined });
      toast.success('Kontrak dihapus');
      onChanged();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="no-kontrak">No. Kontrak</Label>
        <Input
          id="no-kontrak"
          value={noKontrak}
          onChange={(e) => setNoKontrak(e.target.value)}
          disabled={!isAdmin}
          placeholder="mis. 1111/2222/3333"
        />
      </div>

      {project.contract_file ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <span className="text-sm text-muted-foreground">Dokumen kontrak sudah diupload.</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={previewing} onClick={handlePreview}>
              {previewing ? 'Membuka…' : 'Lihat'}
            </Button>
            {isAdmin && (
              <Button variant="ghost" size="sm" disabled={deleting} onClick={handleDelete} className="text-destructive">
                {deleting ? 'Menghapus…' : 'Hapus'}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Belum ada dokumen kontrak.</p>
      )}

      {isAdmin && (
        <div className="space-y-1.5">
          <Label htmlFor="kontrak-file">
            {project.contract_file ? 'Ganti File Kontrak' : 'Upload File Kontrak'} ({ALLOWED_EXTS.join(', ')}, maks {MAX_UPLOAD_MB}MB)
          </Label>
          <div className="flex gap-2">
            <Input id="kontrak-file" type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} />
            <Button disabled={submitting} onClick={handleUpload}>
              {submitting ? 'Mengupload…' : 'Upload'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
