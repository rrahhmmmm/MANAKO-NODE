import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { API_URL, REFRESH_COOKIE_NAME, refreshCookieOptions } from '@/lib/auth-config';

type RefreshResponse =
  | { success: true; data: { access_token: string; refresh_token: string } }
  | { success: false; error: { code: string; message: string; details?: unknown } };

export async function POST() {
  const refreshToken = cookies().get(REFRESH_COOKIE_NAME)?.value;
  if (!refreshToken) {
    return NextResponse.json(
      { success: false, error: { code: 'NO_SESSION', message: 'Tidak ada sesi login' } },
      { status: 401 },
    );
  }

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const payload = (await res.json()) as RefreshResponse;

  if (!payload.success) {
    cookies().set(REFRESH_COOKIE_NAME, '', { ...refreshCookieOptions(), maxAge: 0 });
    return NextResponse.json(payload, { status: res.status });
  }

  cookies().set(REFRESH_COOKIE_NAME, payload.data.refresh_token, refreshCookieOptions());

  return NextResponse.json({ success: true, data: { access_token: payload.data.access_token } });
}
