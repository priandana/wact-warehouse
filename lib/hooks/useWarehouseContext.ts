// lib/hooks/useWarehouseContext.ts
// Provides the currently selected warehouse with strict canonical cookie synchronization,
// transition lifecycle tracking, and race condition guards.

'use client';

import { useCallback, useEffect, useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { UserWarehouseAccess } from '@/lib/permissions/getWarehouseAccess';

const CANONICAL_COOKIE_KEY = 'wact_active_warehouse_id';

interface UseWarehouseContextOptions {
  onWarehouseSwitched?: (switchedWarehouse: UserWarehouseAccess) => void;
}

export function useWarehouseContext(
  availableWarehouses: UserWarehouseAccess[],
  options?: UseWarehouseContextOptions
) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeWarehouseId, setActiveWarehouseId] = useState<string | null>(null);
  const [isSwitchingWarehouse, setIsSwitchingWarehouse] = useState<boolean>(false);
  const [targetWarehouseId, setTargetWarehouseId] = useState<string | null>(null);
  const switchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onSwitchedRef = useRef(options?.onWarehouseSwitched);

  useEffect(() => {
    onSwitchedRef.current = options?.onWarehouseSwitched;
  }, [options?.onWarehouseSwitched]);

  // 1. Initial mount: Read and synchronize canonical cookie against accessible warehouses
  useEffect(() => {
    if (!availableWarehouses.length) return;

    const cookieMatch = typeof document !== 'undefined'
      ? document.cookie
          .split('; ')
          .find((row) => row.startsWith(`${CANONICAL_COOKIE_KEY}=`))
          ?.split('=')[1]
      : null;

    const found = cookieMatch && availableWarehouses.find((w) => w.warehouseId === cookieMatch);

    if (found) {
      setActiveWarehouseId(found.warehouseId);
      document.cookie = `${CANONICAL_COOKIE_KEY}=${found.warehouseId}; path=/; max-age=31536000; SameSite=Lax`;
    } else {
      // Default: prefer PDL if available, otherwise first accessible warehouse
      const pdlWh = availableWarehouses.find(
        (w) => w.warehouseCode === 'WH-PDL' || w.warehouseCode === 'PDL' || w.warehouseName.toLowerCase().includes('padalarang')
      );
      const defaultWh = pdlWh ?? availableWarehouses[0];
      setActiveWarehouseId(defaultWh.warehouseId);
      document.cookie = `${CANONICAL_COOKIE_KEY}=${defaultWh.warehouseId}; path=/; max-age=31536000; SameSite=Lax`;
    }
  }, [availableWarehouses]);

  // 2. Lifecycle watcher: Settle switching state when React transition completes
  useEffect(() => {
    if (isSwitchingWarehouse && !isPending) {
      // Enforce smooth minimum frame (180ms) for restrained enterprise motion
      const timer = setTimeout(() => {
        setIsSwitchingWarehouse(false);
        setTargetWarehouseId(null);

        // Invariant #3: Announce the ACTUAL canonical warehouse that settled
        const settledWh = availableWarehouses.find((w) => w.warehouseId === activeWarehouseId)
          || (availableWarehouses.length > 0 ? availableWarehouses[0] : null);

        if (settledWh && onSwitchedRef.current) {
          onSwitchedRef.current(settledWh);
        }
      }, 180);

      return () => clearTimeout(timer);
    }
  }, [isPending, isSwitchingWarehouse, activeWarehouseId, availableWarehouses]);

  // 3. Switch handler with strict invariants & race prevention
  const switchWarehouse = useCallback((warehouseId: string) => {
    // Invariant #4: No-op if target is already active
    if (warehouseId === activeWarehouseId) {
      return;
    }

    // Invariant #5: Prevent switch races / simultaneous rapid triggers
    if (isSwitchingWarehouse) {
      return;
    }

    const target = availableWarehouses.find((w) => w.warehouseId === warehouseId);
    if (!target) return;

    if (switchTimeoutRef.current) {
      clearTimeout(switchTimeoutRef.current);
    }

    setIsSwitchingWarehouse(true);
    setTargetWarehouseId(warehouseId);
    setActiveWarehouseId(warehouseId);

    // Write canonical cookie immediately so server requests read the new warehouse
    document.cookie = `${CANONICAL_COOKIE_KEY}=${warehouseId}; path=/; max-age=31536000; SameSite=Lax`;

    // Invariant #2: Wrapped inside React transition
    startTransition(() => {
      router.refresh();
    });

    // Safety timeout in case server refresh hangs
    switchTimeoutRef.current = setTimeout(() => {
      setIsSwitchingWarehouse(false);
      setTargetWarehouseId(null);
    }, 6000);
  }, [activeWarehouseId, isSwitchingWarehouse, availableWarehouses, router]);

  const activeWarehouse = availableWarehouses.find(
    (w) => w.warehouseId === activeWarehouseId,
  ) ?? (availableWarehouses.length > 0 ? availableWarehouses[0] : null);

  return {
    activeWarehouse,
    activeWarehouseId: activeWarehouse?.warehouseId ?? activeWarehouseId,
    availableWarehouses,
    switchWarehouse,
    isSwitchingWarehouse: isSwitchingWarehouse || isPending,
    targetWarehouseId,
  };
}
