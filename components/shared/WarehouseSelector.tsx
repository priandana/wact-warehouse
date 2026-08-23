// components/shared/WarehouseSelector.tsx
// Dropdown to switch active warehouse (for multi-warehouse users)

'use client';

import { ChevronDown, Check, Building2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { useActiveWarehouse } from '@/components/shared/layout/AppShellProvider';

export function WarehouseSelector() {
  const { activeWarehouse, availableWarehouses, switchWarehouse } = useActiveWarehouse();
  const [open, setOpen] = useState(false);

  if (availableWarehouses.length <= 1) {
    // Only one warehouse — show static badge
    return activeWarehouse ? (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[--color-primary-light]">
        <Building2 className="w-3.5 h-3.5 text-[--color-primary]" />
        <span className="text-xs font-semibold text-[--color-primary]">
          {activeWarehouse.warehouseCode}
        </span>
      </div>
    ) : null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[--color-primary-light] hover:bg-blue-100 transition-colors"
      >
        <Building2 className="w-3.5 h-3.5 text-[--color-primary]" />
        <span className="text-xs font-semibold text-[--color-primary]">
          {activeWarehouse?.warehouseCode ?? '...'}
        </span>
        <ChevronDown className={cn('w-3 h-3 text-[--color-primary] transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 z-50 w-56 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden py-1">
            {availableWarehouses.map((wh) => (
              <button
                key={wh.warehouseId}
                onClick={() => { switchWarehouse(wh.warehouseId); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[--color-text-secondary]">{wh.warehouseCode}</p>
                  <p className="text-sm font-medium text-[--color-text-primary] truncate">{wh.warehouseName}</p>
                </div>
                {wh.warehouseId === activeWarehouse?.warehouseId && (
                  <Check className="w-4 h-4 text-[--color-primary] shrink-0" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
