import { useAuthStore } from '@/lib/auth-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; details?: unknown } };

export class ApiError extends Error {
  constructor(public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch('/api/auth/refresh', { method: 'POST' });
        const body = (await res.json().catch(() => null)) as ApiResponse<{ access_token: string }> | null;
        if (!body?.success) return null;
        return body.data.access_token;
      } catch {
        return null;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function doFetch<T>(path: string, init: RequestInit & { token?: string }): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (init.token) headers.set('Authorization', `Bearer ${init.token}`);

  return fetch(`${API_URL}${path}`, { ...init, headers, cache: 'no-store' });
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { token?: string } = {},
): Promise<T> {
  let res = await doFetch<T>(path, init);
  let body = (await res.json().catch(() => null)) as ApiResponse<T> | null;

  if (!body) {
    throw new ApiError('NETWORK', `Response bukan JSON (status ${res.status})`);
  }

  if (!body.success && res.status === 401 && body.error.code === 'UNAUTHORIZED') {
    const newToken = await refreshAccessToken();
    if (newToken) {
      const { user } = useAuthStore.getState();
      if (user) useAuthStore.getState().setSession({ user, access_token: newToken });
      res = await doFetch<T>(path, { ...init, token: newToken });
      body = (await res.json().catch(() => null)) as ApiResponse<T> | null;
      if (!body) throw new ApiError('NETWORK', `Response bukan JSON (status ${res.status})`);
    } else {
      useAuthStore.getState().clear();
      void fetch('/api/auth/logout', { method: 'POST' });
      if (typeof window !== 'undefined') window.location.href = '/login';
    }
  }

  if (!body.success) {
    throw new ApiError(body.error.code, body.error.message, body.error.details);
  }
  return body.data;
}

/** Untuk endpoint yang mengembalikan file mentah (bukan envelope JSON), mis. preview/download dokumen. */
export async function apiFetchBlob(path: string, token?: string): Promise<Blob> {
  const res = await fetchBlobResponse(path, token);
  return res.blob();
}

/** Sama seperti apiFetchBlob, tapi juga mengembalikan filename dari header Content-Disposition (untuk download file yang di-generate server, mis. export Excel). */
export async function apiFetchBlobWithFilename(
  path: string,
  token?: string,
): Promise<{ blob: Blob; filename: string | null }> {
  const res = await fetchBlobResponse(path, token);
  const disposition = res.headers.get('Content-Disposition');
  const match = disposition?.match(/filename="?([^"]+)"?/);
  return { blob: await res.blob(), filename: match?.[1] ?? null };
}

async function fetchBlobResponse(path: string, token?: string): Promise<Response> {
  const headers = new Headers();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${API_URL}${path}`, { headers, cache: 'no-store' });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiResponse<never> | null;
    throw new ApiError(body && !body.success ? body.error.code : 'NETWORK', body && !body.success ? body.error.message : `Gagal mengambil file (status ${res.status})`);
  }
  return res;
}
