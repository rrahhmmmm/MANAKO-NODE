import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { API_URL, REFRESH_COOKIE_NAME, refreshCookieOptions } from '@/lib/auth-config';

export async function POST() {
  const refreshToken = cookies().get(REFRESH_COOKIE_NAME)?.value;

  if (refreshToken) {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch {
      // logout must always succeed client-side even if the backend call fails
    }
  }

  cookies().set(REFRESH_COOKIE_NAME, '', { ...refreshCookieOptions(), maxAge: 0 });
  return NextResponse.json({ success: true, data: {} });
}
