'use client';
// components/shared/layout/AppShell.tsx
// Responsive App Shell — Mobile (Integrated Top Header + Bottom Nav) & Desktop (Sidebar + Topbar)

import { useIsDesktop } from '@/lib/hooks/useMediaQuery';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { WarehouseSelector } from '@/components/shared/WarehouseSelector';
import { NavigationProgressBar } from './NavigationProgressBar';
import Link from 'next/link';
import { Bell } from 'lucide-react';
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
      <div className="flex min-h-screen bg-[#F8FAFC]">
        <NavigationProgressBar />
        <Sidebar
          warehouseName={warehouseName}
          warehouseCode={warehouseCode}
          userName={userName}
          userRole={userRole}
        />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Desktop Clean Topbar */}
          <header className="h-16 px-8 bg-white/70 backdrop-blur-md border-b border-slate-200/70 sticky top-0 z-20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                WACT
              </span>
              <span className="text-slate-300">/</span>
              <span className="text-sm font-extrabold text-slate-900 tracking-tight">
                {currentTitle}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <WarehouseSelector />
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
      <NavigationProgressBar />
      {/* Mobile Integrated Top Header */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200/60 px-4 py-2.5 flex items-center justify-between">
        <WarehouseSelector />

        <div className="flex items-center gap-2">
          <Link
            href="/notifications"
            className="relative p-2 rounded-full text-slate-600 hover:bg-slate-100 active:scale-95 transition-all touch-target flex items-center justify-center"
            aria-label="Notifikasi"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </Link>
          <Link
            href="/profile"
            className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs"
            aria-label="Profil"
          >
            {userName ? userName[0].toUpperCase() : 'U'}
          </Link>
        </div>
      </header>

      {/* Mobile Content Area */}
      <main className="flex-1 pb-safe-nav">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
