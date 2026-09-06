'use client';
// components/shared/layout/AppShell.tsx
// Responsive App Shell — Mobile (Integrated Top Header + Bottom Nav) & Desktop (Sidebar + Topbar)
// Smooth content cross-fade transition and restrained top progress indicator during warehouse switching.

import { useState, useEffect, useCallback } from 'react';
import { useIsDesktop } from '@/lib/hooks/useMediaQuery';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { WarehouseSelector } from '@/components/shared/WarehouseSelector';
import { NavigationProgressBar } from './NavigationProgressBar';
import { NotificationDropdownFlyout } from '@/components/notifications/NotificationDropdownFlyout';
import { MobileNavDrawer } from './MobileNavDrawer';
import { getUnreadNotificationCountAction } from '@/app/actions/notifications';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Menu } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { getInitials } from '@/lib/utils/rolePresentation';

interface AppShellProps {
  children: React.ReactNode;
  warehouseName?: string;
  warehouseCode?: string;
  userName?: string;
  userRole?: string;
  userRoles?: string[];
  isSuperAdmin?: boolean;
  isSwitchingWarehouse?: boolean;
}

export function AppShell({
  children,
  warehouseName,
  warehouseCode,
  userName,
  userRole,
  userRoles,
  isSuperAdmin,
  isSwitchingWarehouse,
}: AppShellProps) {
  const isDesktop = useIsDesktop();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const res = await getUnreadNotificationCountAction();
      if (res.success) {
        setUnreadCount(res.unreadCount);
      }
    } catch {
      // Graceful fallback
    }
  }, []);

  // 1. Initial Fetch & Realtime Subscription
  useEffect(() => {
    refreshUnreadCount();

    const supabase = createClient();
    let channel: any = null;
    let isMounted = true;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || !isMounted) return;

      const channelName = `appshell-notifications-${user.id}-${Date.now()}`;
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `recipient_id=eq.${user.id}`,
          },
          () => {
            if (isMounted) {
              refreshUnreadCount();
            }
          }
        )
        .subscribe();
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isMounted) {
        refreshUnreadCount();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
      window.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshUnreadCount]);

  // Format unread badge
  const displayBadge = unreadCount > 99 ? '99+' : unreadCount > 0 ? String(unreadCount) : null;

  // Desktop Composition
  if (isDesktop) {
    let currentTitle = 'WACT';
    if (pathname.startsWith('/inspections/templates')) currentTitle = 'Master Template QC';
    else if (pathname.startsWith('/inspections/new')) currentTitle = 'Mulai Inspeksi QC';
    else if (pathname.startsWith('/inspections/')) currentTitle = 'Detail Inspeksi QC';
    else if (pathname === '/inspections') currentTitle = 'QC & Inspeksi';
    else if (pathname.startsWith('/assets/')) currentTitle = 'Detail Aset';
    else if (pathname === '/assets') currentTitle = 'Aset & Mesin';
    else if (pathname.startsWith('/cases/new')) currentTitle = 'Buat Kasus Baru';
    else if (pathname.startsWith('/cases/')) currentTitle = 'Detail Kasus';
    else if (pathname === '/cases') currentTitle = 'Daftar Kasus';
    else if (pathname === '/dashboard') currentTitle = 'Dashboard';
    else if (pathname === '/my-tasks') currentTitle = 'Tugas Saya';
    else if (pathname === '/maintenance') currentTitle = 'Maintenance';
    else if (pathname === '/analytics') currentTitle = 'Analitik';
    else if (pathname === '/reports') currentTitle = 'Laporan';
    else if (pathname === '/notifications') currentTitle = 'Notifikasi';
    else if (pathname === '/master-data') currentTitle = 'Master Data';
    else if (pathname === '/users') currentTitle = 'Pengguna';
    else if (pathname === '/profile') currentTitle = 'Profil';

    return (
      <div className="flex min-h-screen bg-[#EEF2F7] dark:bg-[#0D1322] text-[#172033] dark:text-[#F8FAFC]">
        <NavigationProgressBar />
        <Sidebar
          warehouseName={warehouseName}
          warehouseCode={warehouseCode}
          userName={userName}
          userRole={userRole}
          userRoles={userRoles}
          isSuperAdmin={isSuperAdmin}
        />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Desktop Clean Soft Topbar */}
          <header className="h-16 px-8 bg-[#EEF2F7]/95 dark:bg-[#131C31]/95 backdrop-blur-md border-b border-white/70 dark:border-slate-800/50 sticky top-0 z-20 flex items-center justify-between relative shadow-[0_4px_12px_-4px_rgba(163,177,198,0.2)] dark:shadow-[0_4px_12px_-4px_rgba(0,0,0,0.5)]">
            {/* Indeterminate top indicator during warehouse switching */}
            {isSwitchingWarehouse && (
              <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-blue-100/50 overflow-hidden z-50 pointer-events-none">
                <div className="h-full bg-blue-600 shadow-[0_0_8px_#2563eb] animate-indeterminate-bar" />
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                WACT
              </span>
              <span className="text-slate-300 dark:text-slate-600 font-bold">/</span>
              <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                {currentTitle}
              </span>
            </div>

            <div className="flex items-center gap-3 relative">
              <WarehouseSelector />
              <button
                type="button"
                onClick={() => setIsFlyoutOpen((prev) => !prev)}
                className={cn(
                  'relative p-2 rounded-xl text-slate-600 dark:text-slate-300 bg-[#EEF2F7] dark:bg-[#131C31] shadow-[3px_3px_8px_rgba(163,177,198,0.32),-3px_-3px_8px_rgba(255,255,255,0.95)] dark:shadow-[3px_3px_8px_rgba(0,0,0,0.5),-2px_-2px_6px_rgba(255,255,255,0.03)] border border-white/70 dark:border-white/5 hover:text-blue-600 active:scale-95 transition-all',
                  isFlyoutOpen && 'shadow-[inset_2px_2px_4px_rgba(163,177,198,0.35),inset_-2px_-2px_4px_rgba(255,255,255,0.95)] text-blue-600'
                )}
                title="Notifikasi"
              >
                <Bell className="w-4 h-4" />
                {displayBadge && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white font-black text-[10px] flex items-center justify-center ring-2 ring-[#EEF2F7] dark:ring-[#131C31] shadow-xs">
                    {displayBadge}
                  </span>
                )}
              </button>

              {/* Desktop Notification Dropdown Flyout */}
              <NotificationDropdownFlyout
                isOpen={isFlyoutOpen}
                onClose={() => setIsFlyoutOpen(false)}
                unreadCount={unreadCount}
                onUnreadCountChange={setUnreadCount}
              />
            </div>
          </header>

          {/* Main Content Viewport — Smooth cross-fade transition without layout shift */}
          <main
            className={cn(
              'flex-1 p-6 sm:p-8 overflow-y-auto max-w-7xl w-full mx-auto transition-opacity duration-200 ease-out',
              isSwitchingWarehouse && 'opacity-45 pointer-events-none'
            )}
          >
            {children}
          </main>
        </div>
      </div>
    );
  }

  // Check whether current route is a focused creation/wizard flow
  const isFocusFlow = pathname === '/cases/new' || pathname === '/inspections/new';

  // Mobile Composition
  return (
    <div className="flex flex-col min-h-screen bg-[#EEF2F7] dark:bg-[#0D1322] text-[#172033] dark:text-[#F8FAFC]">
      <NavigationProgressBar />

      {/* Mobile Topbar */}
      <header className="h-14 px-3 sm:px-4 bg-[#EEF2F7]/95 dark:bg-[#131C31]/95 backdrop-blur-md border-b border-white/70 dark:border-slate-800/50 sticky top-0 z-30 flex items-center justify-between relative shadow-[0_2px_8px_-2px_rgba(163,177,198,0.2)] dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.5)]">
        {/* Indeterminate top indicator during warehouse switching */}
        {isSwitchingWarehouse && (
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-blue-100/50 overflow-hidden z-50 pointer-events-none">
            <div className="h-full bg-blue-600 shadow-[0_0_6px_#2563eb] animate-indeterminate-bar" />
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="p-1.5 -ml-1 rounded-xl text-slate-700 dark:text-slate-200 bg-[#EEF2F7] dark:bg-[#131C31] shadow-[2.5px_2.5px_6px_rgba(163,177,198,0.3),-2.5px_-2.5px_6px_rgba(255,255,255,0.9)] dark:shadow-[2.5px_2.5px_6px_rgba(0,0,0,0.45),-2px_-2px_5px_rgba(255,255,255,0.03)] border border-white/60 dark:border-white/5 touch-target flex items-center justify-center active:scale-95 transition-all"
            aria-label="Buka Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <WarehouseSelector />
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/notifications"
            className="relative p-1.5 rounded-xl text-slate-700 dark:text-slate-200 bg-[#EEF2F7] dark:bg-[#131C31] shadow-[2.5px_2.5px_6px_rgba(163,177,198,0.3),-2.5px_-2.5px_6px_rgba(255,255,255,0.9)] dark:shadow-[2.5px_2.5px_6px_rgba(0,0,0,0.45),-2px_-2px_5px_rgba(255,255,255,0.03)] border border-white/60 dark:border-white/5 touch-target flex items-center justify-center active:scale-95 transition-all"
            aria-label="Notifikasi"
          >
            <Bell className="w-4 h-4" />
            {displayBadge && (
              <span className="absolute 1 top-1 right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-rose-500 text-white font-black text-[9px] flex items-center justify-center ring-1 ring-white shadow-2xs">
                {displayBadge}
              </span>
            )}
          </Link>
          <Link
            href="/profile"
            className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-md shadow-blue-500/25 ring-2 ring-white/80 dark:ring-slate-800"
            aria-label="Profil"
          >
            {getInitials(userName)}
          </Link>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <MobileNavDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        userName={userName}
        userRole={userRole}
        userRoles={userRoles}
        isSuperAdmin={isSuperAdmin}
        warehouseName={warehouseName}
        warehouseCode={warehouseCode}
        unreadCount={unreadCount}
      />

      {/* Mobile Content Area — Smooth cross-fade transition without layout shift */}
      <main
        className={cn(
          'flex-1 transition-opacity duration-200 ease-out',
          !isFocusFlow && 'pb-safe-nav',
          isSwitchingWarehouse && 'opacity-45 pointer-events-none'
        )}
      >
        {children}
      </main>

      {!isFocusFlow && <BottomNav />}
    </div>
  );
}
