'use client';
// components/shared/WarehouseSelector.tsx
// Seamless active warehouse pill with responsive presentation & smooth loading states:
// - Desktop (>= 640px): Compact floating popover dropdown
// - Mobile (< 640px): High-polish mobile bottom sheet via Viewport-Level React Portal
// - Visual switching feedback with micro-spinner and 120ms item selection transition

import { ChevronDown, Check, Building2, X, Loader2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils/cn';
import { useActiveWarehouse } from '@/components/shared/layout/AppShellProvider';
import { formatMultiRoleString } from '@/lib/utils/rolePresentation';

interface WarehouseSelectorProps {
  className?: string;
}

export function WarehouseSelector({ className }: WarehouseSelectorProps) {
  const {
    activeWarehouse,
    availableWarehouses,
    switchWarehouse,
    isSwitchingWarehouse,
    targetWarehouseId,
  } = useActiveWarehouse();

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [justSelectedId, setJustSelectedId] = useState<string | null>(null);
  const selectTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (selectTimerRef.current) clearTimeout(selectTimerRef.current);
    };
  }, []);

  // Prevent background scrolling on mobile (< 640px) and handle Escape key on all viewports
  useEffect(() => {
    if (!open) return;

    const isMobile = window.innerWidth < 640;
    const originalOverflow = document.body.style.overflow;

    if (isMobile) {
      document.body.style.overflow = 'hidden';
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (isMobile) {
        document.body.style.overflow = originalOverflow;
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

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

  const handleSelectWarehouse = (warehouseId: string) => {
    // Invariant #4: No-op if selecting already active warehouse
    if (warehouseId === activeWarehouse.warehouseId) {
      setOpen(false);
      return;
    }

    // Invariant #5: Prevent switch races
    if (isSwitchingWarehouse) {
      return;
    }

    // Snappy 120ms item selection feedback before closing dropdown / sheet
    setJustSelectedId(warehouseId);

    selectTimerRef.current = setTimeout(() => {
      switchWarehouse(warehouseId);
      setOpen(false);
      setJustSelectedId(null);
    }, 120);
  };

  // Identify target warehouse being switched to
  const displayWh = isSwitchingWarehouse && targetWarehouseId
    ? availableWarehouses.find((w) => w.warehouseId === targetWarehouseId) || activeWarehouse
    : activeWarehouse;

  return (
    <div className={cn('relative inline-block text-left', className)}>
      <button
        onClick={() => {
          if (!isSwitchingWarehouse) {
            setOpen(!open);
          }
        }}
        disabled={isSwitchingWarehouse}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold border border-slate-200/80 shadow-2xs transition-all duration-150 active:scale-95 touch-target cursor-pointer',
          isSwitchingWarehouse && 'opacity-85 pointer-events-none'
        )}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Pilih Gudang Operasional"
      >
        {isSwitchingWarehouse ? (
          <Loader2 className="w-3 h-3 animate-spin text-blue-600 shrink-0" />
        ) : (
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 ring-2 ring-emerald-100" />
        )}
        <span className="font-extrabold text-slate-900 tracking-tight transition-opacity duration-150">
          {displayWh.warehouseCode}
        </span>
        <span className="text-[11px] text-slate-500 truncate max-w-[100px] hidden sm:inline">
          {displayWh.warehouseName}
        </span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-slate-400 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          {/* ── DESKTOP POPOVER (>= 640px) ── */}
          <div className="hidden sm:block">
            {/* Desktop backdrop to close on click outside */}
            <div
              className="fixed inset-0 z-50 bg-slate-900/10 backdrop-blur-[1px]"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute right-0 left-auto top-full mt-2 z-[60] w-72 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-2 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Pilih Gudang Operasional</p>
              </div>
              <div className="py-1 max-h-60 overflow-y-auto space-y-1 no-scrollbar">
                {availableWarehouses.map((wh) => {
                  const isSelected = wh.warehouseId === activeWarehouse.warehouseId;
                  const isPendingThis = wh.warehouseId === justSelectedId || (isSwitchingWarehouse && wh.warehouseId === targetWarehouseId);

                  return (
                    <button
                      key={wh.warehouseId}
                      onClick={() => handleSelectWarehouse(wh.warehouseId)}
                      disabled={isSwitchingWarehouse}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all duration-120 cursor-pointer',
                        isPendingThis
                          ? 'bg-blue-100/80 text-blue-950 font-bold ring-1 ring-blue-300'
                          : isSelected
                          ? 'bg-blue-50/90 text-blue-900 font-semibold ring-1 ring-blue-200/60'
                          : 'hover:bg-slate-50 text-slate-700'
                      )}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={cn('text-xs font-bold', isSelected || isPendingThis ? 'text-blue-700' : 'text-slate-900')}>
                            {wh.warehouseCode}
                          </span>
                          {wh.roles.length > 0 && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              ({formatMultiRoleString(wh.roles, { maxVisible: 3 })})
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate">{wh.warehouseName}</p>
                      </div>
                      {isPendingThis ? (
                        <Loader2 className="w-4 h-4 text-blue-600 shrink-0 animate-spin" />
                      ) : isSelected ? (
                        <Check className="w-4 h-4 text-blue-600 shrink-0 stroke-[2.5]" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── MOBILE BOTTOM SHEET (< 640px) via Viewport React Portal ── */}
          {mounted && createPortal(
            <div
              className="sm:hidden fixed inset-0 z-[60] flex flex-col justify-end"
              role="dialog"
              aria-modal="true"
              aria-label="Pilih Gudang Operasional"
            >
              {/* Full Viewport Backdrop (covers header, page, and BottomNav) */}
              <div
                className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-sm transition-opacity duration-200 animate-in fade-in"
                onClick={() => setOpen(false)}
                aria-hidden="true"
              />

              {/* Bottom Sheet Container */}
              <div
                className="relative z-[70] w-full bg-white rounded-t-[28px] shadow-[0_-10px_40px_rgba(15,23,42,0.25)] border-t border-slate-200/80 px-4 pt-3 flex flex-col max-h-[75vh] animate-in slide-in-from-bottom duration-250 ease-out"
                style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 24px))' }}
              >
                {/* Drag Handle Indicator */}
                <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 shrink-0" />

                {/* Sheet Header */}
                <div className="flex items-start justify-between pb-3.5 mb-2 border-b border-slate-100 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Pilih Gudang Operasional</h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">Tentukan area kerja aktif Anda</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="p-1.5 -mr-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-95 transition-all touch-target cursor-pointer"
                    aria-label="Tutup dialog"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Warehouse List */}
                <div className="overflow-y-auto space-y-2.5 py-1.5 flex-1 no-scrollbar overscroll-contain">
                  {availableWarehouses.map((wh) => {
                    const isSelected = wh.warehouseId === activeWarehouse.warehouseId;
                    const isPendingThis = wh.warehouseId === justSelectedId || (isSwitchingWarehouse && wh.warehouseId === targetWarehouseId);

                    return (
                      <button
                        key={wh.warehouseId}
                        onClick={() => handleSelectWarehouse(wh.warehouseId)}
                        disabled={isSwitchingWarehouse}
                        className={cn(
                          'w-full flex items-center justify-between p-4 rounded-2xl text-left transition-all duration-120 active:scale-[0.98] touch-target cursor-pointer',
                          isPendingThis
                            ? 'bg-blue-100/90 border-2 border-blue-600 text-blue-950 shadow-xs'
                            : isSelected
                            ? 'bg-blue-50/90 border-2 border-blue-600 text-blue-950 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100/90 border border-slate-200/70 text-slate-700'
                        )}
                      >
                        <div className="flex items-center gap-3.5 min-w-0 pr-2">
                          <div className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-sm tracking-tight',
                            isSelected || isPendingThis ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-200/80 shadow-2xs'
                          )}>
                            {wh.warehouseCode.replace(/^WH-/, '')}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={cn('text-sm font-bold tracking-tight', isSelected || isPendingThis ? 'text-blue-950' : 'text-slate-900')}>
                                {wh.warehouseCode}
                              </span>
                              {wh.roles.length > 0 && (
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-semibold shadow-2xs">
                                  {formatMultiRoleString(wh.roles, { maxVisible: 3 })}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 font-medium mt-0.5 break-words">
                              {wh.warehouseName}
                            </p>
                          </div>
                        </div>
                        {isPendingThis ? (
                          <Loader2 className="w-5 h-5 text-blue-600 shrink-0 animate-spin" />
                        ) : isSelected ? (
                          <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                            <Check className="w-4 h-4 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border-2 border-slate-300 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>,
            document.body
          )}
        </>
      )}
    </div>
  );
}
