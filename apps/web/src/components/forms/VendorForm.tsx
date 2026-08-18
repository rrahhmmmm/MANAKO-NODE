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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

export type Vendor = {
  id: number;
  name: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  npwp: string | null;
  created_at: string;
};

const vendorSchema = z.object({
  name: z.string().trim().min(1, 'Nama wajib diisi').max(200),
  contact_name: z.string().trim().max(150),
  contact_phone: z.string().trim().max(30),
  contact_email: z
    .string()
    .trim()
    .max(150)
    .refine((v) => v === '' || z.string().email().safeParse(v).success, 'Email tidak valid'),
  npwp: z.string().trim().max(50),
});

export type VendorFormValues = z.infer<typeof vendorSchema>;

export function VendorForm({
  mode,
  defaultVendor,
  onSubmit,
  submitting,
  submitError,
}: {
  mode: 'create' | 'edit';
  defaultVendor?: Vendor;
  onSubmit: (values: VendorFormValues) => void;
  submitting: boolean;
  submitError: string | null;
}) {
  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      name: defaultVendor?.name ?? '',
      contact_name: defaultVendor?.contact_name ?? '',
      contact_phone: defaultVendor?.contact_phone ?? '',
      contact_email: defaultVendor?.contact_email ?? '',
      npwp: defaultVendor?.npwp ?? '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-md">
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
              <FormLabel>Nama Vendor</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contact_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nama Kontak</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contact_phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telepon Kontak</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contact_email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Kontak</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="npwp"
          render={({ field }) => (
            <FormItem>
              <FormLabel>NPWP</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Menyimpan…' : mode === 'create' ? 'Buat Vendor' : 'Simpan Perubahan'}
        </Button>
      </form>
    </Form>
  );
}
