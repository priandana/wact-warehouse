'use client';
// components/shared/layout/AppShellProvider.tsx
// Client-side wrapper that manages warehouse context and renders AppShell.

import { AppShell } from './AppShell';
import { useWarehouseContext } from '@/lib/hooks/useWarehouseContext';
import type { UserWarehouseAccess } from '@/lib/permissions/getWarehouseAccess';
import { createContext, useContext } from 'react';
import type { Capability } from '@/lib/permissions/capabilities';
import { roleCapabilities } from '@/lib/permissions/roleCapabilities';

// ── Warehouse Context ─────────────────────────────────────────────────────

interface WarehouseContextValue {
  activeWarehouse: UserWarehouseAccess | null;
  activeWarehouseId: string | null;
  availableWarehouses: UserWarehouseAccess[];
  switchWarehouse: (id: string) => void;
  /** Check capability client-side (UX only — DB RLS is the real gate) */
  can: (cap: Capability) => boolean;
}

const WarehouseCtx = createContext<WarehouseContextValue | null>(null);

export function useActiveWarehouse(): WarehouseContextValue {
  const ctx = useContext(WarehouseCtx);
  if (!ctx) throw new Error('useActiveWarehouse must be used inside AppShellProvider');
  return ctx;
}

// ── Provider ─────────────────────────────────────────────────────────────

interface AppShellProviderProps {
  children: React.ReactNode;
  warehouseAccess: UserWarehouseAccess[];
  userName: string;
}

export function AppShellProvider({ children, warehouseAccess, userName }: AppShellProviderProps) {
  const { activeWarehouse, activeWarehouseId, availableWarehouses, switchWarehouse } =
    useWarehouseContext(warehouseAccess);

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
      value={{ activeWarehouse, activeWarehouseId, availableWarehouses, switchWarehouse, can }}
    >
      <AppShell
        warehouseName={activeWarehouse?.warehouseName}
        warehouseCode={activeWarehouse?.warehouseCode}
        userName={userName}
        userRole={activeWarehouse?.roles[0]}
      >
        {children}
      </AppShell>
    </WarehouseCtx.Provider>
  );
}
