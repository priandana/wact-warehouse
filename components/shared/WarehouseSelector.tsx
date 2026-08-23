'use client';
// components/shared/WarehouseSelector.tsx
// Dropdown to switch active warehouse (for multi-warehouse users) — Fintech-grade UI

import { ChevronDown, Check, Building2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { useActiveWarehouse } from '@/components/shared/layout/AppShellProvider';

interface WarehouseSelectorProps {
  variant?: 'compact' | 'expanded';
}

export function WarehouseSelector({ variant = 'compact' }: WarehouseSelectorProps) {
  const { activeWarehouse, availableWarehouses, switchWarehouse } = useActiveWarehouse();
  const [open, setOpen] = useState(false);

  if (!activeWarehouse) return null;

  if (availableWarehouses.length <= 1) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50/80 border border-blue-100/80 text-blue-700 shadow-sm">
        <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
        <span className="text-xs font-bold tracking-tight">{activeWarehouse.warehouseCode}</span>
        {variant === 'expanded' && (
          <span className="text-xs font-medium text-slate-600 truncate max-w-[120px]">
            • {activeWarehouse.warehouseName}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100/80 border border-blue-200/60 text-blue-700 font-bold text-xs shadow-sm transition-all duration-150 active:scale-95 touch-target"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
        <span>{activeWarehouse.warehouseCode}</span>
        {variant === 'expanded' && (
          <span className="font-medium text-slate-600 truncate max-w-[110px]">
            • {activeWarehouse.warehouseName}
          </span>
        )}
        <ChevronDown className={cn('w-3.5 h-3.5 text-blue-600 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-slate-900/10 backdrop-blur-[1px]"
            onClick={() => setOpen(false)}
          />
          {/* Dropdown Menu */}
          <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-white rounded-2xl shadow-xl border border-slate-200/80 p-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="px-3 py-2 border-b border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pilih Gudang Aktif</p>
            </div>
            <div className="py-1 max-h-60 overflow-y-auto space-y-0.5">
              {availableWarehouses.map((wh) => {
                const isSelected = wh.warehouseId === activeWarehouse.warehouseId;
                return (
                  <button
                    key={wh.warehouseId}
                    onClick={() => {
                      switchWarehouse(wh.warehouseId);
                      setOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors',
                      isSelected ? 'bg-blue-50/80 text-blue-700' : 'hover:bg-slate-50 text-slate-700'
                    )}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">{wh.warehouseCode}</span>
                        <span className="text-[10px] font-medium text-slate-400 capitalize">({wh.roles.join(', ')})</span>
                      </div>
                      <p className="text-xs font-medium text-slate-500 truncate">{wh.warehouseName}</p>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
