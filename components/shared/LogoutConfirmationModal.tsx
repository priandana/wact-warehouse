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
        className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Icon and Title */}
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
            <LogOut className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="min-w-0 flex-1">
            <h3
              id="logout-dialog-title"
              className="text-base font-extrabold text-slate-900 tracking-tight leading-snug"
            >
              Keluar dari WACT?
            </h3>
            <p
              id="logout-dialog-desc"
              className="text-xs text-slate-500 font-medium leading-relaxed mt-1"
            >
              Anda akan keluar dari sesi saat ini. Pastikan pekerjaan yang sedang dilakukan sudah tersimpan.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-start gap-2 animate-in fade-in">
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
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors active:scale-95 disabled:opacity-50 touch-target flex items-center justify-center"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleConfirmLogout}
            className={cn(
              'flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs transition-all shadow-md shadow-rose-500/20 active:scale-95 disabled:opacity-70 touch-target flex items-center justify-center gap-1.5'
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
