// lib/hooks/useWarehouseContext.ts
// Provides the currently selected warehouse from cookie/localStorage.
// For multi-warehouse users: tracks which warehouse is "active" for the current session.

'use client';

import { useCallback, useEffect, useState } from 'react';
import type { UserWarehouseAccess } from '@/lib/permissions/getWarehouseAccess';

const STORAGE_KEY = 'wact_active_warehouse_id'; // localStorage = UI prefs only

export function useWarehouseContext(availableWarehouses: UserWarehouseAccess[]) {
  const [activeWarehouseId, setActiveWarehouseId] = useState<string | null>(null);

  useEffect(() => {
    if (!availableWarehouses.length) return;

    const saved = localStorage.getItem(STORAGE_KEY);
    const found = saved && availableWarehouses.find((w) => w.warehouseId === saved);

    if (found) {
      setActiveWarehouseId(found.warehouseId);
    } else {
      // Default to first available
      setActiveWarehouseId(availableWarehouses[0].warehouseId);
    }
  }, [availableWarehouses]);

  const switchWarehouse = useCallback((warehouseId: string) => {
    localStorage.setItem(STORAGE_KEY, warehouseId);
    setActiveWarehouseId(warehouseId);
  }, []);

  const activeWarehouse = availableWarehouses.find(
    (w) => w.warehouseId === activeWarehouseId,
  ) ?? null;

  return {
    activeWarehouse,
    activeWarehouseId,
    availableWarehouses,
    switchWarehouse,
  };
}
