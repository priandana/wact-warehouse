// app/integrity/report/page.tsx
// Public Anonymous Integrity Report Form
// Zero reporter identity capture, EXIF stripping, high-entropy secret generation & confirmation screen.

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  Lock,
  Building2,
  Calendar,
  DollarSign,
  Users,
  Camera,
  XCircle,
  Copy,
  Check,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Info,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import {
  type IntegrityCategory,
  INTEGRITY_CATEGORIES,
} from '@/lib/integrity/types';
import { submitAnonymousReport } from '@/lib/integrity/actions';
import { compressImage } from '@/lib/supabase/storage';

interface WarehouseOption {
  id: string;
  name: string;
  code: string;
}

// Fallback warehouses in case public client fetches are blocked
const DEFAULT_WAREHOUSES: WarehouseOption[] = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Warehouse Padalarang', code: 'PDL' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Warehouse Bandung', code: 'BDG' },
];

export default function PublicIntegrityReportPage() {
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>(DEFAULT_WAREHOUSES);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(DEFAULT_WAREHOUSES[0].id);
  const [selectedCategory, setSelectedCategory] = useState<IntegrityCategory>('theft');
  const [incidentDatetime, setIncidentDatetime] = useState<string>('');
  const [areaDescription, setAreaDescription] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [estimatedLossStr, setEstimatedLossStr] = useState<string>('');
  const [involvedParty, setInvolvedParty] = useState<string>('');

  // Evidence photo state (compressed in browser to strip EXIF)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoMimeType, setPhotoMimeType] = useState<string | null>(null);
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Success state
  const [createdReportCode, setCreatedReportCode] = useState<string | null>(null);
  const [createdAccessSecret, setCreatedAccessSecret] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Load active warehouses on mount
  useEffect(() => {
    async function loadWarehouses() {
      try {
        const res = await fetch('/api/integrity/warehouses', {
          credentials: 'omit',
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.warehouses) && data.warehouses.length > 0) {
            setWarehouses(data.warehouses);
            setSelectedWarehouseId(data.warehouses[0].id);
          }
        }
      } catch {
        // use default fallback
      }
    }
    loadWarehouses();
  }, []);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Format file harus berupa foto (JPEG, PNG, WEBP).');
      return;
    }

    setPhotoProcessing(true);
    setErrorMessage(null);

    try {
      // Browser canvas compression strips EXIF metadata & resizes to max 1920px
      const { blob, contentType } = await compressImage(file, 1920, 0.82);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = (reader.result as string).split(',')[1];
        setPhotoBase64(base64data);
        setPhotoMimeType(contentType);
        setPhotoPreview(URL.createObjectURL(blob));
        setPhotoProcessing(false);
      };
      reader.readAsDataURL(blob);
    } catch {
      setErrorMessage('Gagal memproses foto. Silakan pilih foto lain.');
      setPhotoProcessing(false);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoPreview(null);
    setPhotoBase64(null);
    setPhotoMimeType(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedWarehouseId) {
      setErrorMessage('Pilih gudang terkait kejadian.');
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      setErrorMessage('Kronologi kejadian wajib diisi minimal 10 karakter.');
      return;
    }

    setSubmitting(true);

    try {
      const parsedLoss = estimatedLossStr
        ? parseFloat(estimatedLossStr.replace(/[^0-9]/g, ''))
        : null;

      const res = await submitAnonymousReport({
        warehouseId: selectedWarehouseId,
        category: selectedCategory,
        description: description.trim(),
        incidentDatetime: incidentDatetime ? new Date(incidentDatetime).toISOString() : null,
        areaId: null,
        locationId: null,
        estimatedLoss: parsedLoss,
        involvedPartyDescription: involvedParty.trim() || null,
        photoBase64: photoBase64,
        photoMimeType: photoMimeType,
        photoCaption: 'Foto bukti dari pelapor anonim',
      });

      if (res.success && res.reportCode && res.accessSecret) {
        setCreatedReportCode(res.reportCode);
        setCreatedAccessSecret(res.accessSecret);
      } else {
        setErrorMessage(res.error || 'Gagal mengirimkan laporan. Silakan coba kembali.');
      }
    } catch {
      setErrorMessage('Terjadi kendala jaringan saat mengirimkan laporan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = (text: string, type: 'code' | 'secret') => {
    navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SUCCESS / ISOLATED CONFIRMATION SCREEN
  // ═══════════════════════════════════════════════════════════════════
  if (createdReportCode && createdAccessSecret) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300">
        {/* Top Celebration Card */}
        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-2xl relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center mx-auto ring-8 ring-emerald-500/10">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Laporan Integritas Berhasil Dikirim
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
              Laporan Anda telah tercatat secara anonim tanpa menyimpan identitas akun atau perangkat Anda.
            </p>
          </div>
        </div>

        {/* Security Codes Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl">
          {/* Urgent Warning Banner */}
          <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-400/30 text-amber-200 text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Simpan Nomor Laporan & Kode Akses Anda Sekarang!</span>
            </div>
            <p className="text-[11.5px] text-amber-200/90 leading-relaxed pl-6">
              Untuk menjaga kerahasiaan total, WACT tidak mengirimkan email atau notifikasi ke akun Anda. Kode akses ini <strong>hanya ditampilkan sekali</strong> di layar ini.
            </p>
          </div>

          {/* 1. Report Code */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Nomor Laporan (Report Code)
            </label>
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800 focus-within:border-blue-500 transition-colors">
              <span className="font-mono text-base sm:text-lg font-black text-blue-400 tracking-wider select-all">
                {createdReportCode}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(createdReportCode, 'code')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all active:scale-95 touch-target"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>
          </div>

          {/* 2. Access Secret */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Kode Akses Rahasia (Secret Key)
            </label>
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800 focus-within:border-emerald-500 transition-colors">
              <span className="font-mono text-sm sm:text-base font-black text-emerald-400 tracking-wider select-all break-all">
                {createdAccessSecret}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(createdAccessSecret, 'secret')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all active:scale-95 shrink-0 ml-2 touch-target"
              >
                {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSecret ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex flex-col sm:flex-row gap-3">
            <Link
              href={`/integrity/track?code=${encodeURIComponent(createdReportCode)}&secret=${encodeURIComponent(createdAccessSecret)}`}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-blue-500/20 text-center flex items-center justify-center gap-2 active:scale-[0.98] transition-all min-h-[44px]"
            >
              <span>Lacak Status Laporan Sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/integrity/report"
              onClick={() => {
                setCreatedReportCode(null);
                setCreatedAccessSecret(null);
                setDescription('');
                setPhotoPreview(null);
                setPhotoBase64(null);
              }}
              className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs text-center transition-colors min-h-[44px] flex items-center justify-center"
            >
              Buat Laporan Baru
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN REPORT FORM VIEW
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* ── 1. Page Header & Privacy Guarantees ───────────────────────────── */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/20 text-blue-300 text-xs font-bold">
          <Lock className="w-3.5 h-3.5 text-blue-400" />
          <span>Saluran Pelaporan Anonim Terpercaya</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Laporkan Pelanggaran Integritas
        </h1>

        <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed">
          Bantu wujudkan operasional gudang yang bersih dan tertib. Identitas Anda tidak dicatat oleh sistem WACT.
        </p>

        {/* Prominent Privacy Alert */}
        <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-800/60 text-xs text-blue-200 space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-blue-300">
            <Info className="w-4 h-4 shrink-0 text-blue-400" />
            <span>Jaminan Privasi & Petunjuk Anonimitas</span>
          </div>
          <p className="text-[11.5px] leading-relaxed text-blue-200/90 pl-6">
            • Identitas pelapor <strong>tidak disimpan atau ditampilkan oleh WACT</strong>.<br />
            • Jangan memasukkan nama, NIK/nomor karyawan, atau kontak pribadi Anda di dalam teks laporan jika ingin menjaga anonimitas.<br />
            • Laporan merupakan informasi awal dan tidak menyatakan seseorang terbukti bersalah sebelum investigasi selesai.
          </p>
        </div>
      </div>

      {/* ── 2. Interactive Submission Form ────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-8 space-y-6 shadow-2xl">
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-xs font-semibold text-rose-300 flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Warehouse Selection */}
        <div className="space-y-2">
          <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            <span>Lokasi Gudang Terkait <span className="text-rose-400">*</span></span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {warehouses.map((wh) => {
              const isSelected = selectedWarehouseId === wh.id;
              return (
                <button
                  key={wh.id}
                  type="button"
                  onClick={() => setSelectedWarehouseId(wh.id)}
                  className={cn(
                    'p-3 rounded-2xl border text-left flex items-center justify-between transition-all active:scale-[0.98] min-h-[48px] touch-target',
                    isSelected
                      ? 'bg-blue-600/20 border-blue-500 text-white font-bold ring-1 ring-blue-500/30'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Building2 className={cn('w-4 h-4 shrink-0', isSelected ? 'text-blue-400' : 'text-slate-500')} />
                    <span className="text-xs truncate">{wh.name}</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {wh.code}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Selection */}
        <div className="space-y-2">
          <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
            <span>Kategori Pelanggaran Integritas <span className="text-rose-400">*</span></span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(Object.keys(INTEGRITY_CATEGORIES) as IntegrityCategory[]).map((catKey) => {
              const cat = INTEGRITY_CATEGORIES[catKey];
              const isSelected = selectedCategory === catKey;
              return (
                <button
                  key={catKey}
                  type="button"
                  onClick={() => setSelectedCategory(catKey)}
                  className={cn(
                    'p-3 rounded-2xl border text-left flex flex-col justify-between transition-all active:scale-[0.98] min-h-[54px] touch-target',
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500 text-white font-bold ring-1 ring-indigo-500/30'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  )}
                >
                  <p className="text-xs font-bold leading-snug">{cat.label}</p>
                  <p className="text-[10px] text-slate-500 font-normal leading-tight mt-0.5">
                    {cat.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Incident Datetime & Area (Optional 2-Column) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Perkiraan Waktu Kejadian</span>
            </label>
            <input
              type="datetime-local"
              value={incidentDatetime}
              onChange={(e) => setIncidentDatetime(e.target.value)}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Area / Lokasi Spesifik di Gudang</span>
            </label>
            <input
              type="text"
              value={areaDescription}
              onChange={(e) => setAreaDescription(e.target.value)}
              placeholder="Contoh: Rak B-04 / Area Loading Bay 2"
              className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
        </div>

        {/* Chronology / Description (Required) */}
        <div className="space-y-1.5">
          <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>Kronologi & Detail Kejadian <span className="text-rose-400">*</span></span>
            </span>
            <span className="text-[10px] text-slate-500 font-normal">Min. 10 karakter</span>
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Jelaskan apa yang terjadi secara rinci, barang apa yang terlibat, dan kronologi kejadian..."
            className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 leading-relaxed"
            required
          />
        </div>

        {/* Estimated Loss & Involved Parties (Optional 2-Column) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>Estimasi Nilai Kerugian (Opsional)</span>
            </label>
            <input
              type="text"
              value={estimatedLossStr}
              onChange={(e) => setEstimatedLossStr(e.target.value)}
              placeholder="Contoh: 2500000"
              className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-purple-400" />
              <span>Informasi Dugaan Pihak Terkait (Opsional)</span>
            </label>
            <input
              type="text"
              value={involvedParty}
              onChange={(e) => setInvolvedParty(e.target.value)}
              placeholder="Contoh: Oknum driver vendor atau staf shift malam"
              className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
            />
          </div>
        </div>

        {/* Photo Evidence Upload (Optional) */}
        <div className="space-y-2">
          <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-emerald-400" />
            <span>Foto Bukti Pendukung (Opsional — EXIF & Metadata Dihapus Otomatis)</span>
          </label>

          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handlePhotoSelect}
            className="hidden"
          />

          {photoPreview ? (
            <div className="relative aspect-video max-h-60 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center group">
              <img src={photoPreview} alt="Preview Foto Bukti" className="w-full h-full object-contain" />
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/90 text-slate-300 hover:text-white hover:bg-rose-600 transition-colors"
                title="Hapus Foto"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={photoProcessing}
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-6 rounded-2xl border-2 border-dashed border-slate-800 hover:border-emerald-500/50 bg-slate-950/60 hover:bg-emerald-950/20 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-emerald-300 transition-all min-h-[90px] touch-target"
            >
              {photoProcessing ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-300">Menghapus metadata & mengoptimalkan foto...</span>
                </>
              ) : (
                <>
                  <Camera className="w-6 h-6 text-slate-500" />
                  <span className="text-xs font-bold">Pilih / Ambil Foto Bukti</span>
                  <span className="text-[10px] text-slate-500">Maksimal 10MB • Metadata GPS/Kamera dihapus otomatis</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-3">
          <button
            type="submit"
            disabled={submitting || photoProcessing}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-blue-500/20 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 min-h-[48px] touch-target"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Mengirimkan Laporan Anonim...</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4" />
                <span>Kirim Laporan Anonim Sekarang</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
