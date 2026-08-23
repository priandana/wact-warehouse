'use client';
// components/shared/layout/AppShell.tsx
// Root layout shell — automatically switches between mobile (bottom nav)
// and desktop (sidebar) layouts based on screen width.

import { useIsDesktop } from '@/lib/hooks/useMediaQuery';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';

interface AppShellProps {
  children: React.ReactNode;
  warehouseName?: string;
  warehouseCode?: string;
  userName?: string;
}

export function AppShell({ children, warehouseName, warehouseCode, userName }: AppShellProps) {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <div className="flex min-h-screen bg-[--color-bg]">
        <Sidebar
          warehouseName={warehouseName}
          warehouseCode={warehouseCode}
          userName={userName}
        />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[--color-bg]">
      <main className="flex-1 overflow-y-auto pb-safe-nav">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
