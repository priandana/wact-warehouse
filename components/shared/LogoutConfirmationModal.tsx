'use client';
// components/shared/LogoutConfirmationModal.tsx
// Safe, Accessible, Consumer/Fintech Grade Logout Confirmation Dialog

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { createPortal } from 'react-dom';
import { LogOut, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface LogoutConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LogoutConfirmationModal({
  isOpen,
  onClose,
}: LogoutConfirmationModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  // Keyboard navigation & body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, loading, onClose]);

  const handleConfirmLogout = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        throw signOutError;
      }
      onClose();
      router.push('/login?logged_out=true');
    } catch (err: any) {
      console.error('Logout failed:', err);
      setError('Gagal keluar. Silakan coba lagi.');
      setLoading(false);
    }
  };

  if (!mounted || !isOpen) return null;

  const content = (
    <div
      className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={() => {
        if (!loading) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-dialog-title"
      aria-describedby="logout-dialog-desc"
    >
      <div
        className="w-full max-w-sm bg-[#EEF2F7] dark:bg-[#131C31] rounded-3xl p-6 shadow-[10px_10px_30px_rgba(0,0,0,0.3),-8px_-8px_24px_rgba(255,255,255,0.85)] dark:shadow-[10px_10px_30px_rgba(0,0,0,0.7),-4px_-4px_14px_rgba(255,255,255,0.03)] space-y-5 animate-in zoom-in-95 duration-150 border border-white/80 dark:border-white/5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Icon and Title */}
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#EEF2F7] dark:bg-[#18233D] border border-white/80 dark:border-white/5 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0 shadow-[inset_2px_2px_4px_rgba(244,63,94,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.85)]">
            <LogOut className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="min-w-0 flex-1">
            <h3
              id="logout-dialog-title"
              className="text-base font-black text-slate-900 dark:text-white tracking-tight leading-snug"
            >
              Keluar dari WACT?
            </h3>
            <p
              id="logout-dialog-desc"
              className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mt-1"
            >
              Anda akan keluar dari sesi saat ini. Pastikan pekerjaan yang sedang dilakukan sudah tersimpan.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-white/70 dark:border-white/5 bg-[#EEF2F7] dark:bg-[#131C31] hover:bg-[#E8EDF5] dark:hover:bg-[#18233D] text-slate-700 dark:text-slate-300 font-bold text-xs transition-all shadow-[2.5px_2.5px_6px_rgba(163,177,198,0.28),-2.5px_-2.5px_6px_rgba(255,255,255,0.9)] dark:shadow-[2.5px_2.5px_6px_rgba(0,0,0,0.45),-2px_-2px_5px_rgba(255,255,255,0.03)] active:scale-95 disabled:opacity-50 touch-target flex items-center justify-center cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleConfirmLogout}
            className={cn(
              'flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-extrabold text-xs transition-all shadow-[3px_3px_10px_rgba(244,63,94,0.35),-1px_-1px_4px_rgba(255,255,255,0.6)] active:scale-95 disabled:opacity-70 touch-target flex items-center justify-center gap-1.5 cursor-pointer'
            )}
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Keluar...</span>
              </>
            ) : (
              <span>Keluar</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
