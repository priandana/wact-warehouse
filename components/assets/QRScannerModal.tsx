'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Scan,
  X,
  Camera,
  Search,
  Loader2,
  AlertCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeWarehouseId?: string;
  onScanSuccess?: (detectedCode: string) => void;
}

export function QRScannerModal({ isOpen, onClose, activeWarehouseId, onScanSuccess }: QRScannerModalProps) {
  const router = useRouter();
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearchCode = async (codeToSearch: string) => {
    const raw = codeToSearch.trim();
    if (!raw) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const cleanCode = raw.replace(/^WACT-/, '').toUpperCase();
      const supabase = createClient();

      // Find asset matching asset_code, qr_code_url, or UUID
      let query = supabase
        .from('assets')
        .select('id, asset_code, name, warehouse_id')
        .or(`asset_code.ilike.${cleanCode},qr_code_url.ilike.%${cleanCode}%,id.eq.${cleanCode.length === 36 ? cleanCode : '00000000-0000-0000-0000-000000000000'}`);

      if (activeWarehouseId) {
        query = query.eq('warehouse_id', activeWarehouseId);
      }

      const { data: assets, error } = await query.limit(1);

      if (error) throw new Error(error.message);

      if (!assets || assets.length === 0) {
        setErrorMessage(`Aset dengan kode "${raw}" tidak ditemukan di gudang aktif.`);
        setLoading(false);
        return;
      }

      const foundAsset = assets[0];
      if (onScanSuccess) {
        onScanSuccess(raw);
        onClose();
        return;
      }
      onClose();
      router.push(`/assets/${foundAsset.id}`);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal mencari aset.');
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearchCode(manualCode);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-in fade-in">
      <div className="w-full max-w-sm bg-[#EEF2F7] dark:bg-[#131C31] text-slate-900 dark:text-slate-100 rounded-3xl p-5 sm:p-6 neu-raised-lg border border-black/[0.04] dark:border-white/[0.05] space-y-4 max-h-[calc(100dvh-2rem)] sm:max-h-[85vh] overflow-y-auto overscroll-contain animate-in zoom-in-95 relative">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black/[0.04] dark:border-white/[0.05]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl neu-icon-well flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Scan className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-extrabold tracking-tight">Scan QR Code Aset</h3>
          </div>
          <button
            onClick={onClose}
            className="neu-icon-well w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera Scanner Viewport Mock / Scanner Box */}
        <div className="relative aspect-square rounded-2xl bg-slate-950 overflow-hidden flex flex-col items-center justify-center text-white p-6 border border-blue-500/30 shadow-inner">
          {/* Laser Scan Animation Line */}
          <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-pulse" />

          {/* Corner Markers */}
          <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-blue-400 rounded-tl-lg" />
          <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-blue-400 rounded-tr-lg" />
          <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-blue-400 rounded-bl-lg" />
          <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-blue-400 rounded-br-lg" />

          <Camera className="w-10 h-10 text-blue-400 mb-2 animate-bounce" />
          <p className="text-xs font-bold text-slate-200 text-center">
            Arahkan kamera ke QR Code pada fisik aset
          </p>
          <p className="text-[10px] text-slate-400 text-center mt-1">
            Format: WACT-[Kode Aset]
          </p>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Manual Input Search Fallback */}
        <form onSubmit={handleFormSubmit} className="space-y-2 pt-1">
          <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Atau Masukkan Kode Aset Manual
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Contoh: BDG-FL-001"
                className="w-full px-3.5 py-2.5 rounded-xl neu-inset bg-transparent border-0 text-xs font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 uppercase"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !manualCode.trim()}
              className="px-4 py-2.5 rounded-xl fintech-btn-primary text-white font-bold text-xs disabled:opacity-50 flex items-center gap-1.5 active:scale-95 transition-all"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              <span>Cari</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
