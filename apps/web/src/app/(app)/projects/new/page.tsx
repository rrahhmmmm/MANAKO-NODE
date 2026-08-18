'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  ProjectForm,
  idOrUndefined,
  type Project,
  type ProjectFormValues,
} from '@/components/forms/ProjectForm';

export default function NewProjectPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.access_token);
  const currentUser = useAuthStore((s) => s.user);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') router.replace('/projects');
  }, [currentUser, router]);

  if (currentUser && currentUser.role !== 'admin') return null;

  async function handleSubmit(values: ProjectFormValues) {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const project = await apiFetch<Project>('/projects', {
        method: 'POST',
        body: JSON.stringify({
          project_type: values.project_type,
          name: values.name,
          vendor_id: idOrUndefined(values.vendor_id),
          pic_ikt_id: idOrUndefined(values.pic_ikt_id),
          pic_vendor_id: idOrUndefined(values.pic_vendor_id),
          value: values.value === '' ? undefined : Number(values.value),
          start_date: values.start_date || undefined,
          end_date: values.end_date || undefined,
          classification: values.classification,
          contract_type: values.contract_type,
          parent_project_id: idOrUndefined(values.parent_project_id),
          description: values.description || undefined,
          no_kontrak: values.no_kontrak || undefined,
        }),
        token: token ?? undefined,
      });
      toast.success('Project berhasil dibuat');
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tambah Project</h1>
        <p className="text-sm text-muted-foreground">Buat project baru & tentukan kode otomatis.</p>
      </div>
      <ProjectForm mode="create" onSubmit={handleSubmit} submitting={submitting} submitError={submitError} />
    </div>
  );
}
