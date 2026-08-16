'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuthStore, type AuthUser } from '@/lib/auth-store';

export function SessionBootstrap() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const setSession = useAuthStore((s) => s.setSession);
  const setStatus = useAuthStore((s) => s.setStatus);

  useEffect(() => {
    if (status !== 'idle') return;
    setStatus('loading');

    (async () => {
      try {
        const res = await fetch('/api/auth/refresh', { method: 'POST' });
        const payload = (await res.json()) as
          | { success: true; data: { access_token: string } }
          | { success: false; error: { code: string; message: string } };
        if (!payload.success) throw new Error(payload.error.message);

        const user = await apiFetch<AuthUser>('/auth/me', { token: payload.data.access_token });
        setSession({ user, access_token: payload.data.access_token });
      } catch {
        setStatus('unauthenticated');
        router.replace('/login');
      }
    })();
  }, [status, router, setSession, setStatus]);

  return null;
}
