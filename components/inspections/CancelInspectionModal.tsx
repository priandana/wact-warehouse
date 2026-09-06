'use client';

import { useState } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { cancelInspectionAction } from '@/app/actions/inspections';

interface CancelInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  inspectionId: string;
  inspectionNumber?: string;
  onSuccess?: () => void;
}

export function CancelInspectionModal({
  isOpen,
  onClose,
  inspectionId,
  inspectionNumber,
  onSuccess,
}: CancelInspectionModalProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Alasan pembatalan wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await cancelInspectionAction({
        inspectionId,
        reason: reason.trim(),
      });

      if (res.success) {
        onClose();
        if (onSuccess) onSuccess();
      } else {
        setError(res.error || 'Gagal membatalkan inspeksi.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm overflow-hidden animate-in fade-in">
      <div className="bg-[#EEF2F7] dark:bg-[#131C31] neu-raised-lg rounded-3xl border border-black/[0.04] dark:border-white/[0.05] max-w-md w-full p-5 sm:p-6 space-y-4 max-h-[calc(100dvh-2rem)] sm:max-h-[85vh] overflow-y-auto overscroll-contain animate-in zoom-in-95 duration-150 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
            <div className="w-10 h-10 rounded-2xl neu-icon-well flex items-center justify-center bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
              Batalkan Inspeksi
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl neu-icon-well flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Apakah Anda yakin ingin membatalkan inspeksi{' '}
          {inspectionNumber ? (
            <span className="font-mono font-black text-slate-800 dark:text-slate-100 neu-inset-sm px-2 py-0.5 rounded-lg border border-black/[0.04] dark:border-white/[0.05]">
              {inspectionNumber}
            </span>
          ) : (
            'ini'
          )}
          ? Sesi draft akan ditutup permanen dengan status <span className="font-bold text-slate-800 dark:text-slate-200">Dibatalkan</span>.
        </p>

        {error && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Alasan Pembatalan <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Unit aset sedang dipakai darurat / inspeksi dialihkan ke jadwal lain..."
              className="w-full text-xs rounded-2xl neu-inset p-3.5 focus:outline-none focus:ring-2 focus:ring-rose-500/30 font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-black/[0.04] dark:border-white/[0.05]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold neu-btn-secondary transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-bold text-xs shadow-md active:scale-95 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <span>Konfirmasi Pembatalan</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
