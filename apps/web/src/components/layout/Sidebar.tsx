'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderPlus,
  FileSpreadsheet,
  Building2,
  FileText,
  CloudUpload,
  Users,
  History,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/lib/auth-store';

const NAV = [
  { icon: LayoutDashboard,  label: 'Dashboard',      href: '/dashboard' },
  { icon: FolderPlus,       label: 'Tambah Project', href: '/projects/new' },
  { icon: FileSpreadsheet,  label: 'Reports',        href: '/reports' },
  { icon: Building2,        label: 'Master Vendor',  href: '/vendors' },
  { icon: FileText,         label: 'Master Dokumen', href: '/documents' },
  { icon: CloudUpload,      label: 'Sync OneDrive',  href: '/sync' },
  { icon: Users,            label: 'Users',          href: '/users',      role: 'admin' as const },
  { icon: History,          label: 'Audit Logs',     href: '/audit-logs', role: 'admin' as const },
];

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const items = NAV.filter((n) => !n.role || user?.role === n.role);

  return (
    <aside className="hidden md:flex flex-col w-60 bg-slate-900 text-white p-4 fixed inset-y-0 left-0">
      <div className="text-xl font-bold mb-6">Manako</div>
      <nav className="flex-1 space-y-1">
        {items.map((item) => {
          const active = pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                active ? 'bg-primary/80' : 'hover:bg-white/10',
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      {user && (
        <div className="text-xs opacity-70 mt-4 border-t border-white/10 pt-3">
          {user.name} · {user.role}
        </div>
      )}
    </aside>
  );
}
