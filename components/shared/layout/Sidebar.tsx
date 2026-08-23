'use client';
// components/shared/layout/Sidebar.tsx
// Desktop sidebar navigation — Clean Modern SaaS Feel

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
  PlusCircle,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface NavGroup {
  label?: string;
  items: {
    href: string;
    icon: React.ElementType;
    label: string;
    badge?: string | number;
  }[];
}

const navGroups: NavGroup[] = [
  {
    items: [
      { href: '/dashboard', icon: Home,          label: 'Dashboard' },
      { href: '/cases',     icon: FileText,      label: 'Daftar Kasus' },
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
    label: 'Laporan & Analisis',
    items: [
      { href: '/analytics',   icon: BarChart2,      label: 'Analitik' },
      { href: '/reports',     icon: FileText,       label: 'Laporan SLA' },
    ],
  },
  {
    label: 'Konfigurasi',
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

export function Sidebar({ warehouseName, warehouseCode, userName, userRole }: SidebarProps) {
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
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <aside className="w-[260px] h-screen sticky top-0 bg-white border-r border-slate-200/80 flex flex-col justify-between shrink-0 z-30 select-none shadow-[2px_0_12px_rgba(15,23,42,0.02)]">
      <div>
        {/* Logo & Brand Header */}
        <div className="px-5 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-md shadow-blue-500/20">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-900">WACT</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700">PRO</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium leading-none mt-0.5">Warehouse Action Tracker</p>
            </div>
          </div>
        </div>

        {/* Primary Action Button Desktop */}
        <div className="px-4 pt-4 pb-2">
          <Link
            href="/cases/new"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm shadow-blue-600/30 active:scale-[0.98] transition-all duration-150"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Laporkan Kasus</span>
          </Link>
        </div>

        {/* Warehouse Context Pill */}
        {warehouseName && (
          <div className="px-4 py-1.5">
            <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">{warehouseCode}</span>
                <p className="text-xs font-semibold text-slate-700 truncate">{warehouseName}</p>
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Active Warehouse" />
            </div>
          </div>
        )}

        {/* Navigation links */}
        <nav className="px-3 py-2 space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto no-scrollbar">
          {navGroups.map((group, gi) => (
            <div key={gi} className="space-y-0.5">
              {group.label && (
                <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150',
                      isActive
                        ? 'bg-blue-50 text-blue-600 shadow-sm shadow-blue-100/50'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-blue-600' : 'text-slate-400')} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* User Footer Profile Card */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/70 shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-slate-800 to-slate-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
              {getInitials(userName)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate leading-tight">{userName || 'Pengguna'}</p>
              <p className="text-[10px] text-slate-400 font-medium truncate capitalize">{userRole || 'Anggota Tim'}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Keluar"
            aria-label="Keluar"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
