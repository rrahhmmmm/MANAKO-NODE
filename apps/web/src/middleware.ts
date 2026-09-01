import { NextResponse, type NextRequest } from 'next/server';
import { REFRESH_COOKIE_NAME } from '@/lib/auth-config';

export function middleware(req: NextRequest) {
  const hasSession = req.cookies.has(REFRESH_COOKIE_NAME);
  if (!hasSession) {
    const url = new URL('/login', req.url);
    url.searchParams.set('next', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!login|forgot|api|_next|images|favicon.ico).*)'],
};
