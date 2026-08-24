'use client';
// components/shared/layout/Sidebar.tsx
// Minimalist, Clean SaaS Desktop Sidebar Navigation

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Package,
  FileText,
  ClipboardCheck,
  Wrench,
  BarChart2,
  Bell,
  Settings,
  Building2,
  Plus,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  badge?: string | number;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    items: [
      { href: '/dashboard', icon: Home,           label: 'Dashboard' },
      { href: '/cases',     icon: FileText,       label: 'Daftar Kasus' },
      { href: '/my-tasks',  icon: ClipboardCheck, label: 'Tugas Saya' },
    ],
  },
  {
    label: 'Operasional',
    items: [
      { href: '/assets',      icon: Package,        label: 'Aset & Mesin' },
      { href: '/inspections', icon: ClipboardCheck, label: 'QC & Inspeksi' },
      { href: '/maintenance', icon: Wrench,         label: 'Maintenance' },
    ],
  },
  {
    label: 'Analisis',
    items: [
      { href: '/analytics',   icon: BarChart2,      label: 'Analitik' },
      { href: '/reports',     icon: FileText,       label: 'Laporan' },
    ],
  },
  {
    label: 'Pengaturan',
    items: [
      { href: '/notifications', icon: Bell,        label: 'Notifikasi' },
      { href: '/master-data',   icon: Settings,    label: 'Master Data' },
      { href: '/users',         icon: Building2,   label: 'Pengguna' },
    ],
  },
];

interface SidebarProps {
  warehouseName?: string;
  warehouseCode?: string;
  userName?: string;
  userRole?: string;
}

export function Sidebar({ userName, userRole }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <aside className="w-[240px] h-screen sticky top-0 bg-white border-r border-slate-200/60 flex flex-col justify-between shrink-0 z-30 select-none">
      <div>
        {/* Brand Header */}
        <div className="px-5 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs shadow-blue-500/20">
              <Package className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-slate-900">WACT</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700">PRO</span>
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="px-3.5 pb-2">
          <Link
            href="/cases/new"
            className="flex items-center justify-center gap-1.5 w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-600/20 active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Laporkan Kasus</span>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="px-2.5 py-2 space-y-3.5 max-h-[calc(100vh-220px)] overflow-y-auto no-scrollbar">
          {navGroups.map((group, gi) => {
            const isAdminOrCoord = userRole === 'admin' || userRole === 'coordinator';
            const visibleItems = group.items.filter((item) => {
              if (item.href === '/users' || item.href === '/master-data') {
                return isAdminOrCoord;
              }
              return true;
            });

            if (visibleItems.length === 0) return null;

            return (
              <div key={gi} className="space-y-0.5">
                {group.label && (
                  <p className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {group.label}
                  </p>
                )}
                {visibleItems.map((item) => {
                  const isActive = pathname === item.href ||
                    (item.href !== '/dashboard' && pathname.startsWith(item.href));
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={(e) => {
                        if (isActive && pathname === item.href) {
                          e.preventDefault();
                        }
                      }}
                      className={cn(
                        'flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 active:scale-[0.97]',
                        isActive
                          ? 'bg-blue-50/90 text-blue-700 font-bold shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-blue-600' : 'text-slate-400')} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </div>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-slate-100">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 border border-slate-200/60">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-slate-800 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
              {getInitials(userName)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate leading-tight">{userName || 'Pengguna'}</p>
              <p className="text-[10px] text-slate-400 font-medium truncate">
                {userRole === 'pic_maintenance'
                  ? 'PIC Maintenance'
                  : userRole === 'admin'
                  ? 'Administrator'
                  : userRole === 'qc_leader'
                  ? 'QC Leader'
                  : userRole === 'coordinator'
                  ? 'Koordinator'
                  : userRole === 'reporter'
                  ? 'Reporter'
                  : userRole || 'Staf'}
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Keluar"
            aria-label="Keluar"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
