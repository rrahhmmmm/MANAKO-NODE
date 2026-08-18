'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

export const TERMIN_TYPES = ['monthly', 'quarterly', 'percentage', 'oneoff'] as const;
export type TerminType = (typeof TERMIN_TYPES)[number];

export const TERMIN_TYPE_LABEL: Record<TerminType, string> = {
  monthly: 'Bulanan',
  quarterly: 'Triwulan',
  percentage: 'Persentase',
  oneoff: 'Sekali Bayar',
};

export type Termin = {
  id: number;
  project_id: number;
  name: string | null;
  type: TerminType;
  period_start: string | null;
  period_end: string | null;
  percentage: string;
  amount: string | null;
  due_date: string | null;
  order_index: number;
  created_at: string;
};

const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

const terminSchema = z
  .object({
    name: z.string().trim().max(100),
    type: z.enum(TERMIN_TYPES),
    period_start: z.string(),
    period_end: z.string(),
    percentage: z.string().refine((v) => v === '' || !Number.isNaN(Number(v)), 'Persentase harus berupa angka'),
  })
  .refine((obj) => obj.percentage === '' || (Number(obj.percentage) >= 0 && Number(obj.percentage) <= 100), {
    message: 'Persentase harus di antara 0 dan 100',
    path: ['percentage'],
  })
  .refine((obj) => !obj.period_start || !obj.period_end || obj.period_start <= obj.period_end, {
    message: 'Periode mulai harus sebelum atau sama dengan periode selesai',
    path: ['period_end'],
  });

export type TerminFormValues = z.infer<typeof terminSchema>;

export function TerminForm({
  mode,
  defaultTermin,
  projectValue,
  projectStartDate,
  onSubmit,
  submitting,
  submitError,
}: {
  mode: 'create' | 'edit';
  defaultTermin?: Termin;
  projectValue: string;
  projectStartDate?: string | null;
  onSubmit: (values: TerminFormValues) => void;
  submitting: boolean;
  submitError: string | null;
}) {
  const form = useForm<TerminFormValues>({
    resolver: zodResolver(terminSchema),
    defaultValues: {
      name: defaultTermin?.name ?? '',
      type: defaultTermin?.type ?? 'oneoff',
      period_start: defaultTermin?.period_start?.slice(0, 10) ?? '',
      period_end: defaultTermin?.period_end?.slice(0, 10) ?? '',
      percentage: defaultTermin?.percentage ?? '',
    },
  });

  const type = form.watch('type');
  const percentage = form.watch('percentage');
  const periodStart = form.watch('period_start');

  const effectivePercentage = percentage !== '' ? Number(percentage) : type === 'oneoff' ? 100 : 0;
  const amountPreview = Number(projectValue) * (effectivePercentage / 100);

  const showEarlyStartWarning =
    !!periodStart && !!projectStartDate && periodStart < projectStartDate.slice(0, 10);

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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nama Termin</FormLabel>
              <FormControl>
                <Input placeholder="Otomatis: Termin N" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipe</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue>{(v: TerminType) => TERMIN_TYPE_LABEL[v]}</SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {TERMIN_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TERMIN_TYPE_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="period_start"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Periode Mulai</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                {showEarlyStartWarning && (
                  <FormDescription className="text-amber-600">
                    Periode mulai sebelum tanggal mulai project.
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="period_end"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Periode Selesai</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="percentage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Persentase (%)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" min="0" max="100" placeholder={type === 'oneoff' ? '100' : '0'} {...field} />
              </FormControl>
              <FormDescription>Estimasi nilai: {rupiah.format(Number.isFinite(amountPreview) ? amountPreview : 0)}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Menyimpan…' : mode === 'create' ? 'Buat Termin' : 'Simpan Perubahan'}
        </Button>
      </form>
    </Form>
  );
}
