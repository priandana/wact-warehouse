'use client';
// components/shared/layout/AppShellProvider.tsx
// Client-side wrapper that manages canonical warehouse context, transitions, and renders AppShell & Toast.

import { createContext, useContext, useCallback } from 'react';
import { AppShell } from './AppShell';
import { useWarehouseContext } from '@/lib/hooks/useWarehouseContext';
import type { UserWarehouseAccess } from '@/lib/permissions/getWarehouseAccess';
import type { Capability } from '@/lib/permissions/capabilities';
import { roleCapabilities } from '@/lib/permissions/roleCapabilities';
import { ToastProvider, useToast } from '@/components/shared/Toast';

// ── Warehouse Context ─────────────────────────────────────────────────────

interface WarehouseContextValue {
  activeWarehouse: UserWarehouseAccess | null;
  activeWarehouseId: string | null;
  availableWarehouses: UserWarehouseAccess[];
  switchWarehouse: (id: string) => void;
  isSwitchingWarehouse: boolean;
  targetWarehouseId: string | null;
  /** Check capability client-side (UX only — DB RLS is the real gate) */
  can: (cap: Capability) => boolean;
}

const WarehouseCtx = createContext<WarehouseContextValue | null>(null);

export function useActiveWarehouse(): WarehouseContextValue {
  const ctx = useContext(WarehouseCtx);
  if (!ctx) throw new Error('useActiveWarehouse must be used inside AppShellProvider');
  return ctx;
}

// ── Inner Provider with Toast Integration ─────────────────────────────────

interface AppShellContentProps {
  children: React.ReactNode;
  warehouseAccess: UserWarehouseAccess[];
  userName: string;
  isSuperAdmin?: boolean;
}

function AppShellContent({ children, warehouseAccess, userName, isSuperAdmin }: AppShellContentProps) {
  const { showToast } = useToast();

  const handleWarehouseSwitched = useCallback((switchedWh: UserWarehouseAccess) => {
    showToast({
      title: 'Warehouse Berhasil Dialihkan',
      description: `${switchedWh.warehouseCode} — ${switchedWh.warehouseName}`,
      variant: 'warehouse',
      duration: 3500,
    });
  }, [showToast]);

  const {
    activeWarehouse,
    activeWarehouseId,
    availableWarehouses,
    switchWarehouse,
    isSwitchingWarehouse,
    targetWarehouseId,
  } = useWarehouseContext(warehouseAccess, {
    onWarehouseSwitched: handleWarehouseSwitched,
  });

  // Union capabilities from all roles in active warehouse
  const effectiveCaps = new Set<Capability>();
  if (activeWarehouse) {
    for (const roleName of activeWarehouse.roles) {
      const caps = roleCapabilities[roleName];
      if (caps) for (const c of caps) effectiveCaps.add(c);
    }
  }

  const can = (cap: Capability) => effectiveCaps.has(cap);

  return (
    <WarehouseCtx.Provider
      value={{
        activeWarehouse,
        activeWarehouseId,
        availableWarehouses,
        switchWarehouse,
        isSwitchingWarehouse,
        targetWarehouseId,
        can,
      }}
    >
      <AppShell
        warehouseName={activeWarehouse?.warehouseName}
        warehouseCode={activeWarehouse?.warehouseCode}
        userName={userName}
        userRole={activeWarehouse?.roles[0]}
        userRoles={activeWarehouse?.roles || []}
        isSuperAdmin={isSuperAdmin}
        isSwitchingWarehouse={isSwitchingWarehouse}
      >
        {children}
      </AppShell>
    </WarehouseCtx.Provider>
  );
}

// ── Root Provider ─────────────────────────────────────────────────────────

export function AppShellProvider(props: AppShellContentProps) {
  return (
    <ToastProvider>
      <AppShellContent {...props} />
    </ToastProvider>
  );
}
