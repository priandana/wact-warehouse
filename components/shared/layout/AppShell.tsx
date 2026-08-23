'use client';
// components/shared/layout/AppShell.tsx
// Root layout shell — Responsive Mobile (BottomNav) & Desktop (Sidebar + Header)

import { useIsDesktop } from '@/lib/hooks/useMediaQuery';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { WarehouseSelector } from '@/components/shared/WarehouseSelector';
import Link from 'next/link';
import { Bell, Search, User } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface AppShellProps {
  children: React.ReactNode;
  warehouseName?: string;
  warehouseCode?: string;
  userName?: string;
  userRole?: string;
}

export function AppShell({ children, warehouseName, warehouseCode, userName, userRole }: AppShellProps) {
  const isDesktop = useIsDesktop();
  const pathname = usePathname();

  // Desktop Composition
  if (isDesktop) {
    return (
      <div className="flex min-h-screen bg-slate-50/60">
        <Sidebar
          warehouseName={warehouseName}
          warehouseCode={warehouseCode}
          userName={userName}
          userRole={userRole}
        />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Desktop Topbar */}
          <header className="h-16 px-8 bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-20 flex items-center justify-between shadow-[0_1px_4px_rgba(15,23,42,0.02)]">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-400 capitalize">
                WACT
              </span>
              <span className="text-slate-300">/</span>
              <span className="text-sm font-bold text-slate-800 capitalize">
                {pathname === '/dashboard' ? 'Dashboard' : pathname.replace('/', '').replace('-', ' ')}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <WarehouseSelector variant="compact" />
              <Link
                href="/notifications"
                className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                title="Notifikasi"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
              </Link>
            </div>
          </header>

          {/* Main Content Viewport */}
          <main className="flex-1 p-8 overflow-y-auto max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    );
  }

  // Mobile Composition
  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC]">
      {/* Mobile Top Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/60 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <WarehouseSelector variant="compact" />
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/notifications"
            className="relative p-2 rounded-full text-slate-600 hover:bg-slate-100 active:scale-95 transition-all touch-target flex items-center justify-center"
            aria-label="Notifikasi"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </Link>
          <Link
            href="/profile"
            className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm"
            aria-label="Profil"
          >
            {userName ? userName[0].toUpperCase() : 'U'}
          </Link>
        </div>
      </header>

      {/* Main Content Area with Safe Area Bottom Padding */}
      <main className="flex-1 pb-safe-nav">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
