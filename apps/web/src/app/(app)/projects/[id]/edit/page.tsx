'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  ProjectForm,
  idOrNull,
  type Project,
  type ProjectFormValues,
} from '@/components/forms/ProjectForm';

export default function EditProjectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.access_token);
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role === 'admin';
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser && !isAdmin) router.replace(`/projects/${params.id}`);
  }, [currentUser, isAdmin, params.id, router]);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', params.id],
    queryFn: () => apiFetch<Project>(`/projects/${params.id}`, { token: token ?? undefined }),
    enabled: !!token,
  });

  if (currentUser && !isAdmin) return null;
  if (isLoading || !project) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  async function handleSubmit(values: ProjectFormValues) {
    setSubmitError(null);
    setSubmitting(true);
    try {
      await apiFetch<Project>(`/projects/${params.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: values.name,
          vendor_id: idOrNull(values.vendor_id),
          pic_ikt_id: idOrNull(values.pic_ikt_id),
          pic_vendor_id: idOrNull(values.pic_vendor_id),
          value: values.value === '' ? undefined : Number(values.value),
          start_date: values.start_date || null,
          end_date: values.end_date || null,
          classification: values.classification,
          contract_type: values.contract_type,
          parent_project_id: idOrNull(values.parent_project_id),
          description: values.description || null,
          no_kontrak: values.no_kontrak || null,
          status: values.status,
        }),
        token: token ?? undefined,
      });
      toast.success('Perubahan disimpan');
      queryClient.invalidateQueries({ queryKey: ['project', params.id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      router.push(`/projects/${params.id}`);
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit Project</h1>
        <p className="text-sm text-muted-foreground">{project.name}</p>
      </div>
      <ProjectForm
        mode="edit"
        defaultProject={project}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitError={submitError}
      />
    </div>
  );
}
