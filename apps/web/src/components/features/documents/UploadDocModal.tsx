'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const ALLOWED_EXTS = ['pdf', 'doc', 'docx'];
const MAX_UPLOAD_MB = 25;

export function UploadDocModal({
  open,
  onOpenChange,
  terminId,
  docType,
  isTtb,
  onUploaded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  terminId: number;
  docType: string;
  isTtb: boolean;
  onUploaded: () => void;
}) {
  const token = useAuthStore((s) => s.access_token);
  const [file, setFile] = useState<File | null>(null);
  const [customLabel, setCustomLabel] = useState('');
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
      if (customLabel.trim()) formData.append('custom_label', customLabel.trim());
      formData.append('file', file);

      await apiFetch(`/termins/${terminId}/documents`, {
        method: 'POST',
        body: formData,
        token: token ?? undefined,
      });
      toast.success('Dokumen diupload');
      setFile(null);
      setCustomLabel('');
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
          <DialogTitle>Upload {docType}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="doc-file">File ({ALLOWED_EXTS.join(', ')}, maks {MAX_UPLOAD_MB}MB)</Label>
            <Input id="doc-file" type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} />
          </div>

          {isTtb && (
            <div className="space-y-1.5">
              <Label htmlFor="custom-label">Custom Label (TTB)</Label>
              <Input
                id="custom-label"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="mis. TTB Bulan 3"
              />
            </div>
          )}
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
