'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TerminForm, type Termin, type TerminFormValues } from '@/components/forms/TerminForm';

export function TerminFormModal({
  open,
  onOpenChange,
  projectId,
  projectValue,
  projectStartDate,
  termin,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  projectValue: string;
  projectStartDate?: string | null;
  termin?: Termin;
}) {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.access_token);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const mode = termin ? 'edit' : 'create';

  async function handleSubmit(values: TerminFormValues) {
    setSubmitError(null);
    setSubmitting(true);
    const body = {
      name: values.name.trim() || undefined,
      type: values.type,
      period_start: values.period_start || undefined,
      period_end: values.period_end || undefined,
      percentage: values.percentage === '' ? undefined : Number(values.percentage),
    };
    try {
      if (termin) {
        await apiFetch(`/termins/${termin.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
          token: token ?? undefined,
        });
        toast.success('Termin diperbarui');
      } else {
        await apiFetch(`/projects/${projectId}/termins`, {
          method: 'POST',
          body: JSON.stringify(body),
          token: token ?? undefined,
        });
        toast.success('Termin dibuat');
      }
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['project-termins', projectId] });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'PERCENTAGE_EXCEEDED') {
        setSubmitError('Total persentase seluruh termin project ini akan melebihi 100%');
      } else {
        setSubmitError((err as Error).message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Tambah Termin' : `Edit ${termin?.name ?? 'Termin'}`}</DialogTitle>
        </DialogHeader>
        <TerminForm
          mode={mode}
          defaultTermin={termin}
          projectValue={projectValue}
          projectStartDate={projectStartDate}
          onSubmit={handleSubmit}
          submitting={submitting}
          submitError={submitError}
        />
      </DialogContent>
    </Dialog>
  );
}
