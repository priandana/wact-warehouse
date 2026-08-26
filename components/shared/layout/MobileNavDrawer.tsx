'use client';
// components/shared/layout/MobileNavDrawer.tsx
// Responsive Mobile Navigation Drawer for Secondary Operational Modules (React Portal)

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  X,
  Package,
  ClipboardCheck,
  Wrench,
  BarChart2,
  FileText,
  Bell,
  Settings,
  Building2,
  LogOut,
  ChevronRight,
  Shield,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useActiveWarehouse } from './AppShellProvider';
import { Capability } from '@/lib/permissions/capabilities';
import { LogoutConfirmationModal } from '@/components/shared/LogoutConfirmationModal';

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  userRole?: string;
  warehouseName?: string;
  warehouseCode?: string;
  unreadCount?: number;
}

interface DrawerNavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  badge?: string | number;
  description?: string;
  requiredCapability?: (can: (cap: Capability) => boolean) => boolean;
}

interface DrawerNavGroup {
  label: string;
  items: DrawerNavItem[];
}

const DRAWER_GROUPS: DrawerNavGroup[] = [
  {
    label: 'Operasional Gudang',
    items: [
      {
        href: '/my-tasks',
        icon: ClipboardCheck,
        label: 'Tugas Saya',
        description: 'Daftar penugasan & investigasi kasus',
      },
      {
        href: '/inspections',
        icon: Layers,
        label: 'QC & Inspeksi',
        description: 'Checklist audit & kontrol kualitas',
        requiredCapability: (can) => can(Capability.INSPECTION_VIEW),
      },
      {
        href: '/maintenance',
        icon: Wrench,
        label: 'Maintenance',
        description: 'Tindakan perbaikan & riwayat servis',
        requiredCapability: (can) =>
          can(Capability.CASE_UPDATE_PROGRESS) ||
          can(Capability.CASE_ASSIGN) ||
          can(Capability.USER_MANAGE),
      },
    ],
  },
  {
    label: 'Analisis & Pelaporan',
    items: [
      {
        href: '/analytics',
        icon: BarChart2,
        label: 'Analitik',
        description: 'Metrik SLA & performa operasional',
        requiredCapability: (can) =>
          can(Capability.ANALYTICS_VIEW) && can(Capability.CASE_VIEW_ALL),
      },
      {
        href: '/reports',
        icon: FileText,
        label: 'Laporan',
        description: 'Ekspor log investigasi & audit trail',
        requiredCapability: (can) =>
          can(Capability.REPORT_EXPORT) && can(Capability.CASE_VIEW_ALL),
      },
    ],
  },
  {
    label: 'Pengaturan & Akses',
    items: [
      {
        href: '/notifications',
        icon: Bell,
        label: 'Pusat Notifikasi',
        description: 'Aktivitas realtime & penugasan',
      },
      {
        href: '/master-data',
        icon: Settings,
        label: 'Master Data',
        description: 'Area, lokasi, kategori & SLA',
        requiredCapability: (can) => can(Capability.MASTER_DATA_MANAGE),
      },
      {
        href: '/users',
        icon: Building2,
        label: 'Manajemen Pengguna',
        description: 'Hak akses & keanggotaan peran',
        requiredCapability: (can) => can(Capability.USER_MANAGE),
      },
    ],
  },
];

export function MobileNavDrawer({
  isOpen,
  onClose,
  userName,
  userRole,
  warehouseName,
  warehouseCode,
  unreadCount = 0,
}: MobileNavDrawerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { can } = useActiveWarehouse();
  const [mounted, setMounted] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Body scroll lock & Escape key handling
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!mounted) return null;

  const handleTriggerSignOut = () => {
    onClose();
    setIsLogoutModalOpen(true);
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

  const isSuperAdmin = userRole === 'superadmin' || userRole === 'super_admin';

  const formatRoleName = (role?: string) => {
    if (isSuperAdmin) return 'Super Admin';
    if (!role) return 'Operator';
    switch (role) {
      case 'reporter':
        return 'Reporter / Operator';
      case 'qc_leader':
        return 'QC Leader';
      case 'pic_maintenance':
        return 'PIC Maintenance';
      case 'coordinator':
        return 'Coordinator / Officer';
      case 'regional_manager':
        return 'Regional Manager';
      case 'admin':
        return 'Warehouse Admin';
      default:
        return role;
    }
  };

  const drawerContent = (
    <div
      className={cn(
        'fixed inset-0 z-[70] transition-visibility duration-300',
        isOpen ? 'visible' : 'invisible pointer-events-none'
      )}
      aria-modal="true"
      role="dialog"
      aria-label="Menu Navigasi Mobile"
    >
      {/* ── 1. Backdrop Overlay ───────────────────────────────────────── */}
      <div
        onClick={onClose}
        className={cn(
          'fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 ease-out',
          isOpen ? 'opacity-100' : 'opacity-0'
        )}
      />

      {/* ── 2. Slide-Over Panel ───────────────────────────────────────── */}
      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 w-[300px] sm:w-[320px] max-w-[85vw] bg-white shadow-2xl flex flex-col justify-between z-10 transition-transform duration-300 ease-out overflow-hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Top Header & Context */}
        <div className="flex flex-col border-b border-slate-100 bg-slate-50/70">
          <div className="p-4 flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs shadow-blue-500/20">
                <Package className="w-3.5 h-3.5" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm tracking-tight text-slate-900">WACT</span>
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                  PRO
                </span>
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 active:scale-95 transition-all touch-target flex items-center justify-center"
              aria-label="Tutup Menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Active Warehouse Context Pill */}
          <div className="px-4 pb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-[11px] font-extrabold text-slate-700 truncate">
                {warehouseName || 'Warehouse'}
              </span>
            </div>
            {warehouseCode && (
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-700 shrink-0">
                {warehouseCode}
              </span>
            )}
          </div>
        </div>

        {/* ── 3. Navigation Group List ──────────────────────────────────── */}
        <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto overscroll-contain">
          {DRAWER_GROUPS.map((group, gi) => {
            const visibleItems = group.items.filter((item) => {
              if (item.requiredCapability) {
                return item.requiredCapability(can);
              }
              return true;
            });

            if (visibleItems.length === 0) return null;

            return (
              <div key={gi} className="space-y-1">
                <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  {group.label}
                </p>

                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== '/dashboard' && pathname.startsWith(item.href));
                    const Icon = item.icon;
                    const isNotification = item.href === '/notifications';

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => {
                          onClose();
                        }}
                        className={cn(
                          'flex items-center justify-between p-2.5 rounded-xl text-xs transition-all active:scale-[0.98]',
                          isActive
                            ? 'bg-blue-50 text-blue-700 font-bold border border-blue-100 shadow-2xs'
                            : 'text-slate-700 hover:bg-slate-100/70 font-medium'
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={cn(
                              'p-1.5 rounded-lg shrink-0',
                              isActive ? 'bg-blue-100/80 text-blue-700' : 'bg-slate-100 text-slate-500'
                            )}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate leading-tight">{item.label}</p>
                            {item.description && (
                              <p className="text-[10px] text-slate-400 font-normal truncate mt-0.5">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Unread badge for notifications or arrow */}
                        {isNotification && unreadCount > 0 ? (
                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-rose-500 text-white shrink-0 shadow-2xs">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        ) : (
                          <ChevronRight className={cn('w-3.5 h-3.5 shrink-0', isActive ? 'text-blue-500' : 'text-slate-300')} />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* ── 4. User Footer Profile & Sign Out ─────────────────────────── */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-2">
          {/* User Card */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 shadow-2xs">
                {getInitials(userName)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate leading-tight">
                  {userName || 'Pengguna'}
                </p>
                <p className="text-[10px] text-slate-400 font-medium truncate flex items-center gap-1">
                  {isSuperAdmin && <Shield className="w-2.5 h-2.5 text-purple-600 shrink-0" />}
                  <span>{formatRoleName(userRole)}</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTriggerSignOut}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors touch-target flex items-center justify-center"
              title="Keluar Akun"
              aria-label="Keluar Akun"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[9.5px] text-center text-slate-400 font-medium">
            WACT Warehouse V2 · Mobile
          </p>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      <LogoutConfirmationModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
      />
    </div>
  );

  return createPortal(drawerContent, document.body);
}
