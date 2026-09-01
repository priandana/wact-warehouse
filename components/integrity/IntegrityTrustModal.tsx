// components/integrity/IntegrityTrustModal.tsx
// Public Trust Explainer Modal with Local Investigator Privacy Preview
// Explains accurate privacy boundaries without over-claiming infrastructure guarantees.
// Fully optimized for mobile viewports (320px–390px) with safe-area support.

'use client';

import { useEffect, useRef } from 'react';
import {
  Shield,
  ShieldCheck,
  Lock,
  EyeOff,
  Camera,
  AlertTriangle,
  X,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface IntegrityTrustModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IntegrityTrustModal({ isOpen, onClose }: IntegrityTrustModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="trust-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="relative w-[calc(100vw-24px)] sm:w-full sm:max-w-2xl max-h-[calc(100dvh-28px-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] sm:max-h-[88vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto transition-colors"
      >
        {/* Modal Sticky Header */}
        <div className="sticky top-0 z-20 px-4 sm:px-6 py-3.5 sm:py-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="trust-modal-title"
                className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight break-words truncate"
              >
                Bagaimana WACT Melindungi Identitas Anda?
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                Transparansi perlindungan privasi saluran integritas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0 ml-2"
            title="Tutup dialog"
            aria-label="Tutup dialog"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-8 overflow-y-auto space-y-5 sm:space-y-7 text-xs sm:text-sm text-slate-700 dark:text-slate-300 overscroll-contain flex-1">
          {/* ── 1. Core Trust Statement ──────────────────────────────────── */}
          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200/90 dark:border-blue-800/60 text-blue-950 dark:text-blue-200 flex items-start gap-3">
            <Shield className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-xs sm:text-sm leading-snug break-words">
                WACT tidak meminta, menyimpan, atau menampilkan identitas pelapor dalam sistem laporan anonim.
              </p>
              <p className="text-[11px] sm:text-[11.5px] text-blue-800 dark:text-blue-300/90 leading-relaxed break-words">
                Saluran ini dirancang khusus agar Anda dapat melaporkan pelanggaran operasional secara aman tanpa kekhawatiran identitas Anda terhubung dengan laporan.
              </p>
            </div>
          </div>

          {/* ── 2. Three-Step Process Explanation ────────────────────────── */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Alur Kerja & Perlindungan 3 Tahap</span>
            </h3>

            <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
              {/* Step 1 */}
              <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-extrabold text-[11px] flex items-center justify-center shrink-0">
                    1
                  </span>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    Kirim Laporan (Tanpa Akun)
                  </h4>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 pl-7 leading-relaxed">
                  Sistem WACT <strong>tidak meminta atau menyimpan</strong>:
                </p>
                <div className="pl-7 flex flex-wrap gap-1.5 pt-1">
                  {['Nama Pelapor', 'Email', 'NIK / ID Karyawan', 'Akun WACT'].map((item) => (
                    <span
                      key={item}
                      className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-400 text-[10.5px] sm:text-[11px] font-semibold flex items-center gap-1"
                    >
                      <EyeOff className="w-3 h-3" />
                      <span>{item}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-extrabold text-[11px] flex items-center justify-center shrink-0">
                    2
                  </span>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    Dapatkan Kunci Akses Rahasia
                  </h4>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 pl-7 leading-relaxed">
                  Setelah mengirim laporan, Anda menerima <strong>Nomor Laporan</strong> dan <strong>Kunci Akses Rahasia (*Access Secret*)</strong>. Kunci ini adalah satu-satunya alat verifikasi untuk memantau perkembangan atau membalas pertanyaan investigator tanpa login.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-extrabold text-[11px] flex items-center justify-center shrink-0">
                    3
                  </span>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    Investigator Menerima Fakta Kejadian
                  </h4>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 pl-7 leading-relaxed">
                  Tim investigasi hanya menerima informasi operasional (lokasi kejadian, waktu, kronologi, dan bukti foto yang telah disanitasi). Tim investigator <strong>tidak memiliki akses</strong> ke data identitas Anda.
                </p>
              </div>
            </div>
          </div>

          {/* ── 3. Investigator Privacy Preview (Local Demo Data) ────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <EyeOff className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Contoh tampilan investigator</span>
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                Simulasi
              </span>
            </div>

            {/* Live Mockup Box */}
            <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-slate-100/90 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 space-y-3.5 sm:space-y-4">
              {/* Mockup Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    INT-PDL-8K2M4X
                  </span>
                  <span className="text-[9.5px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    Warehouse Padalarang
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-[10px] sm:text-[10.5px] font-extrabold">
                  <Lock className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                  <span>Identitas Tidak Tersedia</span>
                </div>
              </div>

              {/* Unavailable Identity Metadata Grid */}
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 space-y-2">
                <span className="text-[9.5px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Data Identitas Pelapor (Sistem WACT)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2 text-[10.5px] sm:text-[11px]">
                  <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-400 block text-[9px]">Nama Pelapor:</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">ANONIM</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-400 block text-[9px]">Email:</span>
                    <span className="font-bold text-slate-500">Tidak tersedia</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-400 block text-[9px]">NIK / ID:</span>
                    <span className="font-bold text-slate-500">Tidak tersedia</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-400 block text-[9px]">Akun WACT:</span>
                    <span className="font-bold text-slate-500">Tidak ada login</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-400 block text-[9px]">IP Address:</span>
                    <span className="font-bold text-slate-500">Tidak dicatat</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-400 block text-[9px]">User Agent:</span>
                    <span className="font-bold text-slate-500">Tidak dicatat</span>
                  </div>
                </div>
              </div>

              {/* Operational Facts Received by Investigator */}
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between text-[10.5px] sm:text-[11px] text-slate-500">
                  <span>Kategori: <strong>Konsumsi Tanpa Izin</strong></span>
                  <span>Area: <strong>Picking / PTL</strong></span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed italic break-words">
                  &ldquo;Ditemukan kemasan produk minuman terbuka di area lorong rak C-04 pada shift pagi...&rdquo;
                </div>
              </div>
            </div>
          </div>

          {/* ── 4. Photo Privacy Section ─────────────────────────────────── */}
          <div className="space-y-2 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <Camera className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Bagaimana dengan foto bukti yang diunggah?</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              <strong>Foto diproses untuk menghapus metadata lokasi dan perangkat sebelum disimpan.</strong>
            </p>
            <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400 list-disc pl-4 leading-relaxed">
              <li>Pembersihan (*sanitization*) metadata dilakukan otomatis di server WACT.</li>
              <li>Data <strong>EXIF, koordinat GPS, model kamera, dan waktu perangkat</strong> dihapus.</li>
              <li>Nama file asli (*original filename*) diganti dengan nama acak unik.</li>
            </ul>
          </div>

          {/* ── 5. Reporter Self-Identification Warning ──────────────────── */}
          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-xs">Peringatan Menjaga Kerahasiaan Pribadi</p>
              <p className="text-[11px] sm:text-[11.5px] text-amber-800 dark:text-amber-300/90 leading-relaxed break-words">
                Untuk tetap anonim, <strong>jangan menuliskan nama, nomor karyawan, nomor telepon, atau informasi pribadi Anda sendiri</strong> di dalam teks kronologi kejadian.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Sticky Footer */}
        <div className="sticky bottom-0 z-20 px-4 sm:px-6 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-4 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-xs border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <span className="text-[10px] sm:text-[11px] text-slate-500 truncate">
            WACT Whistleblower Protection
          </span>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 sm:px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer min-h-[44px] shrink-0"
          >
            Mengerti & Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
