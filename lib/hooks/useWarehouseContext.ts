// lib/hooks/useWarehouseContext.ts
// Provides the currently selected warehouse from localStorage and cookies.
// Defaults to WH-PDL for development testing if no preference is saved.

'use client';

import { useCallback, useEffect, useState } from 'react';
import type { UserWarehouseAccess } from '@/lib/permissions/getWarehouseAccess';

const STORAGE_KEY = 'wact_active_warehouse_id';

export function useWarehouseContext(availableWarehouses: UserWarehouseAccess[]) {
  const [activeWarehouseId, setActiveWarehouseId] = useState<string | null>(null);

  useEffect(() => {
    if (!availableWarehouses.length) return;

    const cookieMatch = typeof document !== 'undefined'
      ? document.cookie
          .split('; ')
          .find((row) => row.startsWith(`${STORAGE_KEY}=`))
          ?.split('=')[1]
      : null;

    const saved = localStorage.getItem(STORAGE_KEY) || cookieMatch;
    const found = saved && availableWarehouses.find((w) => w.warehouseId === saved);

    if (found) {
      setActiveWarehouseId(found.warehouseId);
      localStorage.setItem(STORAGE_KEY, found.warehouseId);
      document.cookie = `${STORAGE_KEY}=${found.warehouseId}; path=/; max-age=31536000; SameSite=Lax`;
    } else {
      // Default: prefer PDL if available
      const pdlWh = availableWarehouses.find(
        (w) => w.warehouseCode === 'WH-PDL' || w.warehouseCode === 'PDL' || w.warehouseName.toLowerCase().includes('padalarang')
      );
      const defaultWh = pdlWh ?? availableWarehouses[0];
      setActiveWarehouseId(defaultWh.warehouseId);
      localStorage.setItem(STORAGE_KEY, defaultWh.warehouseId);
      document.cookie = `${STORAGE_KEY}=${defaultWh.warehouseId}; path=/; max-age=31536000; SameSite=Lax`;
    }
  }, [availableWarehouses]);

  const switchWarehouse = useCallback((warehouseId: string) => {
    localStorage.setItem(STORAGE_KEY, warehouseId);
    document.cookie = `wact_active_warehouse_id=${warehouseId}; path=/; max-age=31536000; SameSite=Lax`;
    setActiveWarehouseId(warehouseId);
  }, []);

  const activeWarehouse = availableWarehouses.find(
    (w) => w.warehouseId === activeWarehouseId,
  ) ?? (availableWarehouses.length > 0 ? availableWarehouses[0] : null);

  return {
    activeWarehouse,
    activeWarehouseId: activeWarehouse?.warehouseId ?? activeWarehouseId,
    availableWarehouses,
    switchWarehouse,
  };
}
