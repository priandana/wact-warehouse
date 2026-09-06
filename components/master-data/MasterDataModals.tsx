'use client';

// components/master-data/MasterDataModals.tsx
// Responsive, accessible modal system for Master Data Create / Edit / Deactivate actions.
// Uses React Portal directly to document.body with z-[60] layering and backdrop scroll locking.

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, Building2, Layers, FolderTree, AlertCircle, Wrench, Clock, Check } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface BaseModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  maxWidth?: string;
}

export function BaseModal({ open, onClose, title, subtitle, icon: Icon, children, maxWidth = 'max-w-md' }: BaseModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal / Bottom Sheet */}
      <div
        className={cn(
          'relative z-10 w-full bg-[#EEF2F7] dark:bg-[#131C31] neu-raised-lg rounded-t-3xl sm:rounded-3xl border-t sm:border border-black/[0.04] dark:border-white/[0.05] flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200',
          maxWidth
        )}
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 16px))' }}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-black/[0.04] dark:border-white/[0.05] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && (
              <div className="w-9 h-9 rounded-2xl neu-icon-well text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight truncate">{title}</h3>
              {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl neu-icon-well flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-all touch-target"
            aria-label="Tutup modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 overflow-y-auto flex-1 no-scrollbar overscroll-contain">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DEACTIVATION / ACTIVATION CONFIRMATION MODAL
// ─────────────────────────────────────────────────────────────────────────────

interface DeactivationConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  itemName: string;
  isDeactivating: boolean; // true = deactivating, false = activating
}

export function DeactivationConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  itemName,
  isDeactivating,
}: DeactivationConfirmModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan saat memproses permintaan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={title}
      icon={isDeactivating ? AlertTriangle : Check}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        <div className="p-3.5 rounded-2xl neu-inset-sm bg-[#E5EBF3]/40 dark:bg-[#0D1322]/40 border border-black/[0.04] dark:border-white/[0.05] space-y-1.5">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Item target:</p>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100 break-words">{itemName}</p>
        </div>

        {isDeactivating ? (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-amber-800 dark:text-amber-300">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">
              <strong className="font-semibold">Perlindungan Data Historis:</strong> Data historis tidak akan dihapus. Item hanya tidak tersedia untuk dipilih pada data atau transaksi baru.
            </p>
          </div>
        ) : (
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Item ini akan diaktifkan kembali dan dapat dipilih pada formulir kasus, aset, dan inspeksi baru.
          </p>
        )}

        <div className="flex items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold neu-btn-secondary active:scale-95 transition-all touch-target"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleAction}
            disabled={loading}
            className={cn(
              'flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white shadow-md active:scale-95 transition-all touch-target flex items-center justify-center gap-1.5',
              isDeactivating ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800' : 'fintech-btn-primary'
            )}
          >
            {loading ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isDeactivating ? (
              'Nonaktifkan Item'
            ) : (
              'Aktifkan Kembali'
            )}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
