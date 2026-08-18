'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Vendor } from './VendorForm';
import type { ProjectStatus } from '@/components/features/projects/ProjectStatusBadge';

const NONE = '__none__';

export type ProjectType = 'investasi' | 'eksploitasi';
export type ClassificationType = 'rutin' | 'non_rutin';
export type ContractType = 'new' | 'renewal';

export type ProjectListItem = {
  id: number;
  code: string | null;
  name: string;
  vendor_id: number | null;
  vendor: { id: number; name: string } | null;
  status: ProjectStatus;
  classification: ClassificationType | null;
  contract_type: ContractType;
  value: string;
  progress_percent: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
};

export type Project = ProjectListItem & {
  pic_ikt_id: number | null;
  pic_ikt: { id: number; name: string } | null;
  pic_vendor_id: number | null;
  pic_vendor: { id: number; name: string } | null;
  description: string | null;
  no_kontrak: string | null;
  contract_file: string | null;
  parent_project_id: number | null;
  updated_at: string | null;
  termins: unknown[];
};

type UserOption = { id: number; name: string };
type PreviousProject = { id: number; code: string | null; name: string };

const PROJECT_STATUSES: ProjectStatus[] = ['inisiasi', 'running', 'completed', 'closed', 'cancelled'];
const STATUS_LABEL: Record<ProjectStatus, string> = {
  inisiasi: 'Inisiasi',
  running: 'Running',
  completed: 'Completed',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

const projectSchema = z
  .object({
    project_type: z.enum(['investasi', 'eksploitasi']),
    name: z.string().trim().min(1, 'Nama wajib diisi').max(255),
    vendor_id: z.string(),
    pic_ikt_id: z.string(),
    pic_vendor_id: z.string(),
    value: z.string().refine((v) => v === '' || !Number.isNaN(Number(v)), 'Value harus berupa angka'),
    start_date: z.string(),
    end_date: z.string(),
    classification: z.enum(['rutin', 'non_rutin']),
    contract_type: z.enum(['new', 'renewal']),
    parent_project_id: z.string(),
    description: z.string().max(5000),
    no_kontrak: z.string().max(255),
    status: z.enum(['inisiasi', 'running', 'completed', 'closed', 'cancelled']),
  })
  .refine((obj) => obj.value === '' || Number(obj.value) >= 0, {
    message: 'Value tidak boleh negatif',
    path: ['value'],
  })
  .refine((obj) => !obj.start_date || !obj.end_date || obj.start_date <= obj.end_date, {
    message: 'Tanggal mulai harus sebelum atau sama dengan tanggal selesai',
    path: ['end_date'],
  });

export type ProjectFormValues = z.infer<typeof projectSchema>;

export function ProjectForm({
  mode,
  defaultProject,
  onSubmit,
  submitting,
  submitError,
}: {
  mode: 'create' | 'edit';
  defaultProject?: Project;
  onSubmit: (values: ProjectFormValues) => void;
  submitting: boolean;
  submitError: string | null;
}) {
  const token = useAuthStore((s) => s.access_token);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      project_type: 'investasi',
      name: defaultProject?.name ?? '',
      vendor_id: defaultProject?.vendor_id ? String(defaultProject.vendor_id) : NONE,
      pic_ikt_id: defaultProject?.pic_ikt_id ? String(defaultProject.pic_ikt_id) : NONE,
      pic_vendor_id: defaultProject?.pic_vendor_id ? String(defaultProject.pic_vendor_id) : NONE,
      value: defaultProject?.value ?? '',
      start_date: defaultProject?.start_date?.slice(0, 10) ?? '',
      end_date: defaultProject?.end_date?.slice(0, 10) ?? '',
      classification: defaultProject?.classification ?? 'rutin',
      contract_type: defaultProject?.contract_type ?? 'new',
      parent_project_id: defaultProject?.parent_project_id ? String(defaultProject.parent_project_id) : NONE,
      description: defaultProject?.description ?? '',
      no_kontrak: defaultProject?.no_kontrak ?? '',
      status: defaultProject?.status ?? 'inisiasi',
    },
  });

  const projectType = form.watch('project_type');
  const contractType = form.watch('contract_type');
  const vendorId = form.watch('vendor_id');

  const { data: vendors } = useQuery({
    queryKey: ['vendors-all'],
    queryFn: () => apiFetch<Vendor[]>('/vendors', { token: token ?? undefined }),
    enabled: !!token,
  });

  const { data: users } = useQuery({
    queryKey: ['users-all'],
    queryFn: () => apiFetch<UserOption[]>('/users', { token: token ?? undefined }),
    enabled: !!token,
  });

  const { data: codePreview } = useQuery({
    queryKey: ['project-code-preview', projectType],
    queryFn: () =>
      apiFetch<{ preview: string; prefix: string; year: number }>(
        `/projects/code/preview?type=${projectType}`,
        { token: token ?? undefined },
      ),
    enabled: mode === 'create' && !!token,
  });

  const { data: previousProjects } = useQuery({
    queryKey: ['vendor-previous-projects', vendorId],
    queryFn: () =>
      apiFetch<PreviousProject[]>(`/vendors/${vendorId}/previous-projects`, { token: token ?? undefined }),
    enabled: contractType === 'renewal' && !!token && vendorId !== NONE && !!vendorId,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
        {submitError && (
          <Alert variant="destructive">
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        {mode === 'create' ? (
          <FormField
            control={form.control}
            name="project_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipe Project</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {(v: ProjectType) => (v === 'investasi' ? 'Investasi' : 'Eksploitasi')}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="investasi">Investasi</SelectItem>
                    <SelectItem value="eksploitasi">Eksploitasi</SelectItem>
                  </SelectContent>
                </Select>
                {codePreview && (
                  <FormDescription className="flex items-center gap-1.5">
                    Kode: <span className="font-mono">{codePreview.preview}</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="text-muted-foreground">(preview)</TooltipTrigger>
                        <TooltipContent>Kode final ditentukan saat submit.</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <div className="text-sm">
            <span className="text-muted-foreground">Kode: </span>
            <span className="font-mono">{defaultProject?.code ?? '-'}</span>
          </div>
        )}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nama Project</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="vendor_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vendor</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih vendor">
                        {(v: string) =>
                          v === NONE || !v ? '- Tidak dipilih -' : (vendors?.find((x) => String(x.id) === v)?.name ?? v)
                        }
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE}>- Tidak dipilih -</SelectItem>
                    {vendors?.map((v) => (
                      <SelectItem key={v.id} value={String(v.id)}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nilai Kontrak</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="pic_ikt_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>PIC IKT</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih PIC">
                        {(v: string) =>
                          v === NONE || !v ? '- Tidak dipilih -' : (users?.find((x) => String(x.id) === v)?.name ?? v)
                        }
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE}>- Tidak dipilih -</SelectItem>
                    {users?.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="pic_vendor_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>PIC Vendor</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih PIC">
                        {(v: string) =>
                          v === NONE || !v ? '- Tidak dipilih -' : (users?.find((x) => String(x.id) === v)?.name ?? v)
                        }
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE}>- Tidak dipilih -</SelectItem>
                    {users?.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tanggal Mulai</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="end_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tanggal Selesai</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="classification"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Klasifikasi</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue>{(v: ClassificationType) => (v === 'rutin' ? 'Rutin' : 'Non Rutin')}</SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="rutin">Rutin</SelectItem>
                    <SelectItem value="non_rutin">Non Rutin</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {mode === 'edit' && (
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue>{(v: ProjectStatus) => STATUS_LABEL[v]}</SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PROJECT_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="contract_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipe Kontrak</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue>{(v: ContractType) => (v === 'new' ? 'Baru' : 'Renewal')}</SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="new">Baru</SelectItem>
                    <SelectItem value="renewal">Renewal</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {contractType === 'renewal' && (
            <FormField
              control={form.control}
              name="parent_project_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Sebelumnya</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih project">
                          {(v: string) =>
                            v === NONE || !v
                              ? '- Tidak dipilih -'
                              : (previousProjects?.find((x) => String(x.id) === v)?.code ?? v)
                          }
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>- Tidak dipilih -</SelectItem>
                      {previousProjects?.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.code ?? p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(vendorId === NONE || !vendorId) && (
                    <FormDescription>Pilih vendor terlebih dahulu.</FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <FormField
          control={form.control}
          name="no_kontrak"
          render={({ field }) => (
            <FormItem>
              <FormLabel>No. Kontrak</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Deskripsi</FormLabel>
              <FormControl>
                <Textarea rows={4} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Menyimpan…' : mode === 'create' ? 'Buat Project' : 'Simpan Perubahan'}
        </Button>
      </form>
    </Form>
  );
}

export function idOrUndefined(v: string): number | undefined {
  return v && v !== NONE ? Number(v) : undefined;
}

export function idOrNull(v: string): number | null {
  return v && v !== NONE ? Number(v) : null;
}
