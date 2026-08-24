'use client';
// components/shared/WarehouseSelector.tsx
// Seamless active warehouse pill with quick switcher dropdown

import { ChevronDown, Check, Building2 } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { useActiveWarehouse } from '@/components/shared/layout/AppShellProvider';

interface WarehouseSelectorProps {
  className?: string;
}

export function WarehouseSelector({ className }: WarehouseSelectorProps) {
  const router = useRouter();
  const { activeWarehouse, availableWarehouses, switchWarehouse } = useActiveWarehouse();
  const [open, setOpen] = useState(false);

  if (!activeWarehouse) return null;

  if (availableWarehouses.length <= 1) {
    return (
      <div className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100/90 text-slate-700 font-semibold text-xs border border-slate-200/60 shadow-2xs', className)}>
        <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
        <span className="font-bold text-slate-900">{activeWarehouse.warehouseCode}</span>
        <span className="text-[11px] text-slate-500 truncate max-w-[120px] hidden sm:inline">
          • {activeWarehouse.warehouseName}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('relative inline-block text-left', className)}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold border border-slate-200/80 shadow-2xs transition-all duration-150 active:scale-95 touch-target"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 ring-2 ring-emerald-100" />
        <span className="font-extrabold text-slate-900 tracking-tight">{activeWarehouse.warehouseCode}</span>
        <span className="text-[11px] text-slate-500 truncate max-w-[100px] hidden sm:inline">
          {activeWarehouse.warehouseName}
        </span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-slate-400 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/10 backdrop-blur-[1px]"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 z-50 w-64 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="px-3 py-2 border-b border-slate-100">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Pilih Gudang Operasional</p>
            </div>
            <div className="py-1 max-h-60 overflow-y-auto space-y-0.5 no-scrollbar">
              {availableWarehouses.map((wh) => {
                const isSelected = wh.warehouseId === activeWarehouse.warehouseId;
                return (
                  <button
                    key={wh.warehouseId}
                    onClick={() => {
                      switchWarehouse(wh.warehouseId);
                      setOpen(false);
                      router.refresh();
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors',
                      isSelected ? 'bg-blue-50/80 text-blue-700 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                    )}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">{wh.warehouseCode}</span>
                        <span className="text-[10.5px] text-slate-400 font-medium capitalize">
                          ({wh.roles.join(', ')})
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{wh.warehouseName}</p>
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
