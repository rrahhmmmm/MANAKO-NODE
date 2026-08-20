'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiFetchBlob } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const ALLOWED_EXTS = ['pdf', 'doc', 'docx'];
const MAX_UPLOAD_MB = 25;

type Termin = { id: number; name: string | null };

type PrPoDoc = {
  id: number;
  doc_type: string;
  doc_name: string | null;
  no_document: string | null;
  uploaded_at: string;
  pr_po_coverage: { termin_id: number }[];
};

const dateFmt = (v: string) => new Intl.DateTimeFormat('id-ID').format(new Date(v));

export function PrPoCoveragePanel({ projectId, isAdmin }: { projectId: number; isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.access_token);
  const [docType, setDocType] = useState<'PR' | 'PO'>('PR');

  const docsQueryKey = ['pr-po-docs', projectId, docType] as const;
  const { data: docs, isLoading: docsLoading } = useQuery({
    queryKey: docsQueryKey,
    queryFn: () =>
      apiFetch<PrPoDoc[]>(`/projects/${projectId}/pr-po-docs?doc_type=${docType}`, { token: token ?? undefined }),
    enabled: !!token,
  });

  const { data: termins, isLoading: terminsLoading } = useQuery({
    queryKey: ['project-termins', projectId],
    queryFn: () => apiFetch<Termin[]>(`/projects/${projectId}/termins`, { token: token ?? undefined }),
    enabled: !!token,
  });

  async function handleToggleCoverage(doc: PrPoDoc, terminId: number) {
    const current = doc.pr_po_coverage.map((c) => c.termin_id);
    const next = current.includes(terminId) ? current.filter((id) => id !== terminId) : [...current, terminId];

    const prev = queryClient.getQueryData<PrPoDoc[]>(docsQueryKey);
    queryClient.setQueryData<PrPoDoc[]>(docsQueryKey, (rows) =>
      rows?.map((r) => (r.id === doc.id ? { ...r, pr_po_coverage: next.map((termin_id) => ({ termin_id })) } : r)),
    );
    try {
      await apiFetch(`/init-documents/${doc.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ termin_ids: next }),
        token: token ?? undefined,
      });
    } catch (err) {
      queryClient.setQueryData(docsQueryKey, prev);
      toast.error((err as Error).message);
    }
  }

  async function handlePreview(doc: PrPoDoc) {
    try {
      const blob = await apiFetchBlob(`/init-documents/${doc.id}/file`, token ?? undefined);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function handleDelete(doc: PrPoDoc) {
    try {
      await apiFetch(`/init-documents/${doc.id}`, { method: 'DELETE', token: token ?? undefined });
      toast.success('Dokumen dihapus');
      queryClient.invalidateQueries({ queryKey: docsQueryKey });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const isLoading = docsLoading || terminsLoading;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant={docType === 'PR' ? 'default' : 'outline'} size="sm" onClick={() => setDocType('PR')}>
          PR
        </Button>
        <Button variant={docType === 'PO' ? 'default' : 'outline'} size="sm" onClick={() => setDocType('PO')}>
          PO
        </Button>
      </div>

      {isLoading && <Skeleton className="h-40 w-full" />}

      {!isLoading && (!termins || termins.length === 0) && (
        <p className="text-sm text-muted-foreground">Project ini belum punya termin — buat termin dulu di tab Termins.</p>
      )}

      {!isLoading && termins && termins.length > 0 && (
        <div className="border rounded-xl overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dokumen</TableHead>
                <TableHead>No. Dokumen</TableHead>
                {termins.map((t) => (
                  <TableHead key={t.id} className="text-center whitespace-nowrap">
                    {t.name ?? `Termin #${t.id}`}
                  </TableHead>
                ))}
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs?.map((doc) => {
                const covered = new Set(doc.pr_po_coverage.map((c) => c.termin_id));
                return (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.doc_name ?? doc.doc_type}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {doc.no_document ?? '-'}
                      <div>{dateFmt(doc.uploaded_at)}</div>
                    </TableCell>
                    {termins.map((t) => (
                      <TableCell key={t.id} className="text-center">
                        <Switch
                          checked={covered.has(t.id)}
                          onCheckedChange={() => handleToggleCoverage(doc, t.id)}
                          disabled={!isAdmin}
                        />
                      </TableCell>
                    ))}
                    <TableCell>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => handlePreview(doc)}>
                          Lihat
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(doc)}>
                            Hapus
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {docs?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={termins.length + 3} className="text-center text-muted-foreground py-6">
                    Belum ada dokumen {docType}.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {isAdmin && termins && termins.length > 0 && (
        <UploadPrPoForm projectId={projectId} docType={docType} termins={termins} docsQueryKey={docsQueryKey} />
      )}
    </div>
  );
}

function UploadPrPoForm({
  projectId,
  docType,
  termins,
  docsQueryKey,
}: {
  projectId: number;
  docType: 'PR' | 'PO';
  termins: Termin[];
  docsQueryKey: readonly [string, number, string];
}) {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.access_token);
  const [file, setFile] = useState<File | null>(null);
  const [noDocument, setNoDocument] = useState('');
  const [selectedTermins, setSelectedTermins] = useState<Set<number>>(new Set());
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

  function toggleTermin(id: number) {
    setSelectedTermins((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
      if (selectedTermins.size) formData.append('termin_ids', JSON.stringify(Array.from(selectedTermins)));
      formData.append('file', file);

      await apiFetch(`/projects/${projectId}/init-documents`, { method: 'POST', body: formData, token: token ?? undefined });
      toast.success(`${docType} diupload`);
      setFile(null);
      setNoDocument('');
      setSelectedTermins(new Set());
      queryClient.invalidateQueries({ queryKey: docsQueryKey });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border rounded-xl p-4 space-y-3 max-w-xl">
      <h3 className="text-sm font-medium">Upload {docType} baru</h3>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="prpo-file">File ({ALLOWED_EXTS.join(', ')}, maks {MAX_UPLOAD_MB}MB)</Label>
        <Input id="prpo-file" type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="prpo-no">Nomor Dokumen (opsional)</Label>
        <Input id="prpo-no" value={noDocument} onChange={(e) => setNoDocument(e.target.value)} placeholder={`mis. ${docType}-2024/001`} />
      </div>
      <div className="space-y-1.5">
        <Label>Cover Termin (opsional)</Label>
        <div className="flex flex-wrap gap-3">
          {termins.map((t) => (
            <label key={t.id} className="flex items-center gap-1.5 text-sm">
              <Switch checked={selectedTermins.has(t.id)} onCheckedChange={() => toggleTermin(t.id)} size="sm" />
              {t.name ?? `Termin #${t.id}`}
            </label>
          ))}
        </div>
      </div>
      <Button disabled={submitting} onClick={handleSubmit}>
        {submitting ? 'Mengupload…' : 'Upload'}
      </Button>
    </div>
  );
}
