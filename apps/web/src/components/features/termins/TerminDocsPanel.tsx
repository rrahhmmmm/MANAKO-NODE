'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DocChecklistItem, type ChecklistEntry } from '@/components/features/documents/DocChecklistItem';

const addRequirementSchema = z.object({
  doc_type: z.string().trim().regex(/^[A-Z][A-Z0-9_]{1,49}$/, 'Harus UPPER_SNAKE_CASE (mis. BAST)'),
  label: z.string().trim().max(200),
});
type AddRequirementValues = z.infer<typeof addRequirementSchema>;

export function TerminDocsPanel({ terminId, isAdmin }: { terminId: number; isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.access_token);
  const queryKey = ['termin-documents', terminId] as const;
  const [addOpen, setAddOpen] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSubmitting, setAddSubmitting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => apiFetch<ChecklistEntry[]>(`/termins/${terminId}/documents`, { token: token ?? undefined }),
    enabled: !!token,
  });

  const form = useForm<AddRequirementValues>({
    resolver: zodResolver(addRequirementSchema),
    defaultValues: { doc_type: '', label: '' },
  });

  function refetch() {
    queryClient.invalidateQueries({ queryKey });
  }

  async function handleToggleBypass(entry: ChecklistEntry) {
    const prev = queryClient.getQueryData<ChecklistEntry[]>(queryKey);
    queryClient.setQueryData<ChecklistEntry[]>(queryKey, (rows) =>
      rows?.map((r) => (r.doc_type === entry.doc_type ? { ...r, bypass_check: !r.bypass_check } : r)),
    );
    try {
      await apiFetch(`/termins/${terminId}/requirements/${entry.doc_type}`, {
        method: 'PATCH',
        body: JSON.stringify({ bypass: !entry.bypass_check }),
        token: token ?? undefined,
      });
    } catch (err) {
      queryClient.setQueryData(queryKey, prev);
      toast.error((err as Error).message);
    }
  }

  async function handleAddRequirement(values: AddRequirementValues) {
    setAddError(null);
    setAddSubmitting(true);
    try {
      await apiFetch(`/termins/${terminId}/requirements`, {
        method: 'POST',
        body: JSON.stringify({
          doc_type: values.doc_type,
          label: values.label.trim() || undefined,
          required: true,
        }),
        token: token ?? undefined,
      });
      toast.success('Requirement ditambahkan');
      setAddOpen(false);
      form.reset({ doc_type: '', label: '' });
      refetch();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'REQUIREMENT_EXISTS') {
        setAddError('Requirement doc_type ini sudah ada');
      } else {
        setAddError((err as Error).message);
      }
    } finally {
      setAddSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      )}

      {!isLoading && data?.length === 0 && (
        <p className="text-sm text-muted-foreground py-2">Belum ada requirement dokumen.</p>
      )}

      {!isLoading &&
        data?.map((entry) => (
          <DocChecklistItem
            key={entry.doc_type}
            entry={entry}
            terminId={terminId}
            isAdmin={isAdmin}
            onToggleBypass={() => handleToggleBypass(entry)}
            onChanged={refetch}
          />
        ))}

      {isAdmin && (
        <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
          + Tambah Requirement
        </Button>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Requirement</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddRequirement)} className="space-y-4">
              {addError && (
                <Alert variant="destructive">
                  <AlertDescription>{addError}</AlertDescription>
                </Alert>
              )}
              <FormField
                control={form.control}
                name="doc_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Doc Type</FormLabel>
                    <FormControl>
                      <Input {...field} className="uppercase" placeholder="mis. BAST" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label (opsional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={addSubmitting}>
                  {addSubmitting ? 'Menyimpan…' : 'Tambah'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
