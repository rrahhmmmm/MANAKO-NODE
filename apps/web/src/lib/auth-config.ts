export const REFRESH_COOKIE_NAME = 'manako_refresh_token';
export const REFRESH_TTL_DAYS = 30;
export const REFRESH_COOKIE_MAX_AGE = REFRESH_TTL_DAYS * 24 * 60 * 60;

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export function refreshCookieOptions() {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: REFRESH_COOKIE_MAX_AGE,
  };
}
