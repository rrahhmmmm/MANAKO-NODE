import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { API_URL, REFRESH_COOKIE_NAME, refreshCookieOptions } from '@/lib/auth-config';
import type { AuthUser } from '@/lib/auth-store';

type LoginResponse =
  | { success: true; data: { access_token: string; refresh_token: string; user: AuthUser } }
  | { success: false; error: { code: string; message: string; details?: unknown } };

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = (await res.json()) as LoginResponse;

  if (!payload.success) {
    return NextResponse.json(payload, { status: res.status });
  }

  cookies().set(REFRESH_COOKIE_NAME, payload.data.refresh_token, refreshCookieOptions());

  return NextResponse.json({
    success: true,
    data: { access_token: payload.data.access_token, user: payload.data.user },
  });
}
