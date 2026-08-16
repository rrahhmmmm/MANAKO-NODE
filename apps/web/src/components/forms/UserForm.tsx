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

export const USER_ROLES = ['admin', 'inspector', 'viewer', 'vendor_contact'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export type User = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string | null;
};

function buildSchema(mode: 'create' | 'edit') {
  return z
    .object({
      name: z.string().trim().min(1, 'Nama wajib diisi').max(150),
      email: z.string().trim().email('Email tidak valid').max(150),
      phone: z.string().trim().max(30),
      role: z.enum(USER_ROLES),
      password: z.string().max(72),
    })
    .superRefine((val, ctx) => {
      if (mode === 'create' && val.password.length < 8) {
        ctx.addIssue({ code: 'custom', path: ['password'], message: 'Password minimal 8 karakter' });
      }
      if (mode === 'edit' && val.password.length > 0 && val.password.length < 8) {
        ctx.addIssue({ code: 'custom', path: ['password'], message: 'Password minimal 8 karakter' });
      }
    });
}

export type UserFormValues = {
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  password: string;
};

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Admin',
  inspector: 'Inspector',
  viewer: 'Viewer',
  vendor_contact: 'Vendor Contact',
};

export function UserForm({
  mode,
  defaultUser,
  onSubmit,
  submitting,
  submitError,
}: {
  mode: 'create' | 'edit';
  defaultUser?: User;
  onSubmit: (values: UserFormValues) => void;
  submitting: boolean;
  submitError: string | null;
}) {
  const form = useForm<UserFormValues>({
    resolver: zodResolver(buildSchema(mode)),
    defaultValues: {
      name: defaultUser?.name ?? '',
      email: defaultUser?.email ?? '',
      phone: defaultUser?.phone ?? '',
      role: defaultUser?.role ?? 'viewer',
      password: '',
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
              <FormLabel>Nama</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telepon</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {USER_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABEL[role]}
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
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              {mode === 'edit' && (
                <FormDescription>Kosongkan jika tidak ingin mengubah password.</FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Menyimpan…' : mode === 'create' ? 'Buat User' : 'Simpan Perubahan'}
        </Button>
      </form>
    </Form>
  );
}
