import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { SessionBootstrap } from '@/components/auth/SessionBootstrap';
import { REFRESH_COOKIE_NAME } from '@/lib/auth-config';

// Presence-only check: confirms a session cookie exists so we don't flash
// protected content. Real validity (expired/invalid refresh token) is
// resolved client-side by <SessionBootstrap>, which redirects to /login on
// failure — avoids a Fastify round-trip on every navigation.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  if (!cookies().has(REFRESH_COOKIE_NAME)) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen">
      <SessionBootstrap />
      <Sidebar />
      <Topbar />
      <main className="md:ml-60 p-6">{children}</main>
    </div>
  );
}
