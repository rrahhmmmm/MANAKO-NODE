'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const ALLOWED_EXTS = ['pdf', 'doc', 'docx'];
const MAX_UPLOAD_MB = 25;

export function UploadInitDocModal({
  open,
  onOpenChange,
  projectId,
  docType,
  docLabel,
  onUploaded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  docType: string;
  docLabel: string;
  onUploaded: () => void;
}) {
  const token = useAuthStore((s) => s.access_token);
  const [file, setFile] = useState<File | null>(null);
  const [noDocument, setNoDocument] = useState('');
  const [submitting, setSubmitting] = useState(false);
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

  async function handleSubmit() {
    if (!file) {
      setError('Pilih file terlebih dahulu');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('doc_type', docType);
      if (noDocument.trim()) formData.append('no_document', noDocument.trim());
      formData.append('file', file);

      await apiFetch(`/projects/${projectId}/init-documents`, {
        method: 'POST',
        body: formData,
        token: token ?? undefined,
      });
      toast.success('Dokumen diupload');
      setFile(null);
      setNoDocument('');
      onOpenChange(false);
      onUploaded();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload {docLabel}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="init-doc-file">File ({ALLOWED_EXTS.join(', ')}, maks {MAX_UPLOAD_MB}MB)</Label>
            <Input id="init-doc-file" type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="init-doc-no">Nomor Dokumen (opsional)</Label>
            <Input
              id="init-doc-no"
              value={noDocument}
              onChange={(e) => setNoDocument(e.target.value)}
              placeholder="mis. PR-2024/001"
            />
          </div>
        </div>

        <DialogFooter>
          <Button disabled={submitting} onClick={handleSubmit}>
            {submitting ? 'Mengupload…' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
