'use client';
// components/shared/layout/Sidebar.tsx
// Minimalist, Clean SaaS Desktop Sidebar Navigation

import { useState } from 'react';
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
  Shield,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useRouter } from 'next/navigation';
import { useActiveWarehouse } from './AppShellProvider';
import { Capability } from '@/lib/permissions/capabilities';
import { LogoutConfirmationModal } from '@/components/shared/LogoutConfirmationModal';

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
      { href: '/integrity',     icon: ShieldAlert, label: 'Integrity Center' },
      { href: '/notifications', icon: Bell,        label: 'Notifikasi' },
      { href: '/master-data',   icon: Settings,    label: 'Master Data' },
      { href: '/users',         icon: Building2,   label: 'Pengguna' },
    ],
  },
];

import { getInitials, formatMultiRoleString } from '@/lib/utils/rolePresentation';

interface SidebarProps {
  warehouseName?: string;
  warehouseCode?: string;
  userName?: string;
  userRole?: string;
  userRoles?: string[];
  isSuperAdmin?: boolean;
}

export function Sidebar({ userName, userRole, userRoles, isSuperAdmin }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { can } = useActiveWarehouse();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  return (
    <aside className="w-[240px] h-screen sticky top-0 bg-white border-r border-slate-200/80 flex flex-col justify-between shrink-0 z-30 select-none">
      <div>
        {/* Brand Header */}
        <div className="px-5 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 shrink-0 ring-2 ring-blue-100/80">
              <Package className="w-4.5 h-4.5 stroke-[2.3]" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-base tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">WACT</span>
              <span className="text-[9.5px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200/80 shadow-2xs">PRO</span>
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="px-3.5 pb-2.5">
          <Link
            href="/cases/new"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all duration-150"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Laporkan Kasus</span>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="px-2.5 py-2 space-y-3 max-h-[calc(100vh-230px)] overflow-y-auto no-scrollbar">
          {navGroups.map((group, gi) => {
            const visibleItems = group.items.filter((item) => {
              if (item.href === '/integrity') {
                return can(Capability.INTEGRITY_VIEW);
              }
              if (item.href === '/analytics') {
                return can(Capability.ANALYTICS_VIEW) && can(Capability.CASE_VIEW_ALL);
              }
              if (item.href === '/users') {
                return can(Capability.USER_MANAGE);
              }
              if (item.href === '/master-data') {
                return can(Capability.MASTER_DATA_MANAGE);
              }
              return true;
            });

            if (visibleItems.length === 0) return null;

            return (
              <div key={gi} className="space-y-1">
                {group.label && (
                  <p className="px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
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
                        'flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-150 active:scale-[0.98]',
                        isActive
                          ? 'bg-gradient-to-r from-blue-50/90 to-indigo-50/70 text-blue-700 font-extrabold border border-blue-200/80 shadow-[0_2px_8px_-2px_rgba(37,99,235,0.12)]'
                          : 'text-slate-600 hover:bg-slate-50/90 hover:text-slate-900'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={cn('w-4 h-4 shrink-0 transition-colors', isActive ? 'text-blue-600' : 'text-slate-400')} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
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

      {/* User Footer Profile & Anonymous Reporting */}
      <div className="p-3 border-t border-slate-100 space-y-2">
        <Link
          href="/integrity/report"
          target="_blank"
          referrerPolicy="no-referrer"
          className="w-full flex items-center justify-between px-3 py-2 rounded-2xl bg-slate-50/80 hover:bg-blue-50/80 border border-slate-200/70 hover:border-blue-200/80 text-slate-600 hover:text-blue-700 text-[11px] font-bold transition-all group shadow-2xs"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
            <span>Lapor Anonim</span>
          </div>
          <span className="text-[9.5px] font-black px-2 py-0.5 rounded-full bg-slate-200/70 group-hover:bg-blue-100 group-hover:text-blue-700 text-slate-600 transition-colors">
            Aman
          </span>
        </Link>

        <div className="flex items-center justify-between p-2 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-slate-900 to-slate-700 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs ring-1 ring-slate-100">
              {getInitials(userName)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate leading-tight">{userName || 'Pengguna'}</p>
              <p
                className="text-[10px] text-slate-500 font-medium truncate"
                title={formatMultiRoleString(userRoles || (userRole ? [userRole] : []), { isSuperAdmin, maxVisible: 5 })}
              >
                {formatMultiRoleString(userRoles || (userRole ? [userRole] : []), { isSuperAdmin, maxVisible: 2 })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsLogoutModalOpen(true)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors touch-target flex items-center justify-center cursor-pointer"
            title="Keluar Akun"
            aria-label="Keluar Akun"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <LogoutConfirmationModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
      />
    </aside>
  );
}
