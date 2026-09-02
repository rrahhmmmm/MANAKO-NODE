'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuthStore, type AuthUser } from '@/lib/auth-store';

const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

type LoginValues = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: 'admin@manako.local', password: 'admin123' },
  });

  async function onSubmit(values: LoginValues) {
    setFormError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const payload = (await res.json()) as
        | { success: true; data: { access_token: string; user: AuthUser } }
        | { success: false; error: { code: string; message: string } };

      if (!payload.success) {
        setFormError(payload.error.message);
        return;
      }

      setSession(payload.data);
      const next = searchParams.get('next') ?? '/dashboard';
      router.push(next);
    } catch {
      setFormError('Tidak bisa terhubung ke server');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#0C1C33] p-3 sm:p-6 md:p-10">
      <div className="relative h-[calc(100vh-4rem)] w-full max-w-[1600px] overflow-hidden rounded-3xl shadow-2xl sm:h-[calc(100vh-6rem)] md:h-[calc(100vh-10rem)]">
        <div className="absolute inset-0 bg-[url('/images/login-bg.jpg')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/20" />

        <div className="relative z-10 flex h-full flex-col p-6 md:p-12">
          <div className="flex items-center gap-3 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/40">
              <FileText className="h-4 w-4" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-bold tracking-wide">MANAKO</p>
              <p className="text-[10px] tracking-widest text-white/70">MANAJEMEN KONTRAK</p>
            </div>
          </div>

          <div className="flex flex-1 flex-col justify-center gap-10 py-10 md:flex-row md:items-center md:justify-between md:gap-6">
            <div className="hidden max-w-lg md:block">
              <h1 className="text-5xl font-bold leading-tight text-white">Kelola Setiap Kontrak Tanpa Terlewat</h1>
              <p className="mt-6 text-lg text-white/85">
                Satu dashboard untuk dokumen, jadwal, dan status kontrak perusahaan Anda.
              </p>
              <p className="mt-2 text-sm text-white/60">
                Masuk untuk memantau kontrak dan aktivitas tim secara real-time.
              </p>
            </div>

            <Card className="w-full max-w-[320px] border-white/15 bg-white/10 py-8 text-white shadow-2xl backdrop-blur-xl [--card-spacing:1.5rem] md:mr-4">
              <CardContent className="space-y-5">
                <div>
                  <h2 className="text-xl font-semibold">Masuk</h2>
                  <p className="text-sm text-white/70">Sign in ke sistem manajemen kontrak</p>
                </div>

                {formError && (
                  <Alert variant="destructive" className="border-red-400/30 bg-red-500/10">
                    <AlertDescription className="text-red-100">{formError}</AlertDescription>
                  </Alert>
                )}

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium text-white/90">Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              autoComplete="email"
                              className="h-10 border-transparent bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-white/60"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium text-white/90">Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              autoComplete="current-password"
                              className="h-10 border-transparent bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-white/60"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-blue-600 text-white hover:bg-blue-500"
                    >
                      {loading ? 'Loading…' : 'Sign In'}
                    </Button>
                  </form>
                </Form>

                <p className="text-center text-xs text-white/70">
                  Belum punya akun? <span className="font-semibold text-white">Daftar</span>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
