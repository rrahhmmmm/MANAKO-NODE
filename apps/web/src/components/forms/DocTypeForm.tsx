'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

export const DOC_TYPE_STAGES = ['inisiasi', 'pelaksanaan'] as const;
export type DocTypeStage = (typeof DOC_TYPE_STAGES)[number];

export type DocType = {
  id: number;
  keyname: string | null;
  label: string | null;
  stage: DocTypeStage;
  required: boolean;
  priority: number;
  created_at: string;
};

const KEYNAME_REGEX = /^[A-Z][A-Z0-9_]{1,49}$/;

function slugifyKeyname(label: string) {
  return label
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);
}

const docTypeSchema = z.object({
  keyname: z.string().trim().regex(KEYNAME_REGEX, 'Keyname harus UPPER_SNAKE_CASE (mis. BAST)'),
  label: z.string().trim().min(1, 'Label wajib diisi').max(200),
  stage: z.enum(DOC_TYPE_STAGES),
  required: z.boolean(),
  priority: z.coerce.number().int(),
});

export type DocTypeFormValues = z.infer<typeof docTypeSchema>;

const STAGE_LABEL: Record<DocTypeStage, string> = {
  inisiasi: 'Inisiasi',
  pelaksanaan: 'Pelaksanaan',
};

export function DocTypeForm({
  mode,
  defaultDocType,
  onSubmit,
  submitting,
  submitError,
}: {
  mode: 'create' | 'edit';
  defaultDocType?: DocType;
  onSubmit: (values: DocTypeFormValues) => void;
  submitting: boolean;
  submitError: string | null;
}) {
  const form = useForm<DocTypeFormValues>({
    resolver: zodResolver(docTypeSchema),
    defaultValues: {
      keyname: defaultDocType?.keyname ?? '',
      label: defaultDocType?.label ?? '',
      stage: defaultDocType?.stage ?? 'pelaksanaan',
      required: defaultDocType?.required ?? true,
      priority: defaultDocType?.priority ?? 0,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {submitError && (
          <Alert variant="destructive">
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="label"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Label</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    if (mode === 'create' && !form.formState.dirtyFields.keyname) {
                      form.setValue('keyname', slugifyKeyname(e.target.value));
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="keyname"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Keyname</FormLabel>
              <FormControl>
                <Input {...field} className="uppercase" disabled={mode === 'edit'} />
              </FormControl>
              <FormDescription>
                {mode === 'edit'
                  ? 'Keyname tidak bisa diubah setelah dibuat.'
                  : 'UPPER_SNAKE_CASE, dipakai sebagai kode unik (mis. BAST).'}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="stage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Stage</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih stage" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {DOC_TYPE_STAGES.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {STAGE_LABEL[stage]}
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
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Priority</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormDescription>Menentukan urutan dokumen pada reminder "langkah berikutnya".</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="required"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between gap-4">
              <div>
                <FormLabel>Wajib</FormLabel>
                <FormDescription>Default requirement untuk dokumen ini.</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Menyimpan…' : mode === 'create' ? 'Buat Doc Type' : 'Simpan Perubahan'}
        </Button>
      </form>
    </Form>
  );
}
