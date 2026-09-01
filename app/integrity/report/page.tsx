// app/integrity/report/page.tsx
// Public Anonymous Integrity Report Form
// Zero reporter identity capture, EXIF stripping, high-entropy secret generation & confirmation screen.
// Modern executive visual styling supporting both Light and Dark themes.

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
  PackageX,
  UtensilsCrossed,
  FileSpreadsheet,
  RotateCcw,
  Truck,
  Wrench,
  Users2,
  ClipboardCheck,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  MapPin,
  ShieldCheck,
  Clock,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import {
  type IntegrityCategory,
  type PublicAnnouncementDisplay,
  INTEGRITY_CATEGORIES,
} from '@/lib/integrity/types';
import {
  submitAnonymousReport,
  getPublicIntegrityAnnouncement,
} from '@/lib/integrity/actions';
import { compressImage } from '@/lib/supabase/storage';
import { IntegrityTrustModal } from '@/components/integrity/IntegrityTrustModal';
import { IntegrityAnnouncementBanner } from '@/components/integrity/IntegrityAnnouncementBanner';
import { IntegrityAnnouncementModal } from '@/components/integrity/IntegrityAnnouncementModal';

interface WarehouseOption {
  id: string;
  name: string;
  code: string;
}

const DEFAULT_WAREHOUSES: WarehouseOption[] = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Warehouse Padalarang', code: 'PDL' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Warehouse Bandung', code: 'BDG' },
];

// Visual Category Metadata with Custom Vibrant Icons
const CATEGORY_UI_META: Record<
  IntegrityCategory,
  {
    icon: typeof PackageX;
    iconBg: string;
    iconColor: string;
  }
> = {
  theft: {
    icon: PackageX,
    iconBg: 'bg-rose-100 dark:bg-rose-950/60',
    iconColor: 'text-rose-600 dark:text-rose-400',
  },
  unauthorized_consumption: {
    icon: UtensilsCrossed,
    iconBg: 'bg-amber-100 dark:bg-amber-950/60',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  stock_manipulation: {
    icon: FileSpreadsheet,
    iconBg: 'bg-orange-100 dark:bg-orange-950/60',
    iconColor: 'text-orange-600 dark:text-orange-400',
  },
  return_manipulation: {
    icon: RotateCcw,
    iconBg: 'bg-purple-100 dark:bg-purple-950/60',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
  unauthorized_goods_movement: {
    icon: Truck,
    iconBg: 'bg-blue-100 dark:bg-blue-950/60',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  asset_misuse: {
    icon: Wrench,
    iconBg: 'bg-cyan-100 dark:bg-cyan-950/60',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
  },
  supplier_vendor_collusion: {
    icon: Users2,
    iconBg: 'bg-indigo-100 dark:bg-indigo-950/60',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
  },
  procedure_violation: {
    icon: ClipboardCheck,
    iconBg: 'bg-emerald-100 dark:bg-emerald-950/60',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  other: {
    icon: AlertCircle,
    iconBg: 'bg-slate-100 dark:bg-slate-800',
    iconColor: 'text-slate-600 dark:text-slate-400',
  },
};

export default function PublicIntegrityReportPage() {
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>(DEFAULT_WAREHOUSES);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(DEFAULT_WAREHOUSES[0].id);
  const [selectedCategory, setSelectedCategory] = useState<IntegrityCategory>('theft');
  const [incidentDatetime, setIncidentDatetime] = useState<string>('');
  const [incidentDate, setIncidentDate] = useState<string>('');
  const [incidentTime, setIncidentTime] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [estimatedLossStr, setEstimatedLossStr] = useState<string>('');
  const [involvedParty, setInvolvedParty] = useState<string>('');

  const handleDateChange = (dateVal: string) => {
    setIncidentDate(dateVal);
    if (dateVal && incidentTime) {
      setIncidentDatetime(`${dateVal}T${incidentTime}`);
    } else if (dateVal) {
      setIncidentDatetime(`${dateVal}T00:00`);
    } else {
      setIncidentDatetime('');
    }
  };

  const handleTimeChange = (timeVal: string) => {
    setIncidentTime(timeVal);
    if (incidentDate && timeVal) {
      setIncidentDatetime(`${incidentDate}T${timeVal}`);
    } else if (timeVal) {
      const today = new Date().toISOString().slice(0, 10);
      setIncidentDate(today);
      setIncidentDatetime(`${today}T${timeVal}`);
    } else if (incidentDate) {
      setIncidentDatetime(`${incidentDate}T00:00`);
    } else {
      setIncidentDatetime('');
    }
  };

  // Announcement state & Auto-Open Modal state
  const [announcement, setAnnouncement] = useState<PublicAnnouncementDisplay | null>(null);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);

  // Trust Modal state
  const [isTrustModalOpen, setIsTrustModalOpen] = useState(false);

  // Evidence photo state
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
  const [showSecret, setShowSecret] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const handleCloseAnnouncementModal = () => {
    setIsAnnouncementModalOpen(false);
    if (announcement) {
      const storageKey = `wact_integrity_announcement_seen_${announcement.id || announcement.title}_${announcement.updated_at || ''}`;
      try {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(storageKey, 'true');
        }
      } catch {
        // fail gracefully if sessionStorage is restricted
      }
    }
  };

  // Load active warehouses & announcements on mount
  useEffect(() => {
    async function loadInitialData() {
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
        // fallback
      }

      try {
        const ann = await getPublicIntegrityAnnouncement('report');
        if (ann) {
          setAnnouncement(ann);
          // Auto-open check once per session per announcement version
          const storageKey = `wact_integrity_announcement_seen_${ann.id || ann.title}_${ann.updated_at || ''}`;
          try {
            const seen = typeof window !== 'undefined' ? sessionStorage.getItem(storageKey) : null;
            if (!seen) {
              setIsAnnouncementModalOpen(true);
            }
          } catch {
            setIsAnnouncementModalOpen(true);
          }
        }
      } catch {
        // fallback
      }
    }
    loadInitialData();
  }, []);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Format file harus berupa foto (JPEG, PNG, atau WebP).');
      return;
    }

    setPhotoProcessing(true);
    setErrorMessage(null);

    try {
      // Browser canvas compression strips EXIF metadata
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
      setErrorMessage('Pilih lokasi gudang terkait.');
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
        estimatedLoss: parsedLoss,
        involvedPartyDescription: involvedParty.trim() || null,
        photoBase64,
        photoMimeType,
        photoCaption: 'Foto bukti pelaporan',
      });

      if (res.success && res.reportCode && res.accessSecret) {
        setCreatedReportCode(res.reportCode);
        setCreatedAccessSecret(res.accessSecret);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setErrorMessage(res.error || 'Gagal mengirim laporan. Silakan coba sesaat lagi.');
      }
    } catch {
      setErrorMessage('Terjadi kendala jaringan saat mengirim laporan.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, type: 'code' | 'secret') => {
    navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } else {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2500);
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // SUCCESS CONFIRMATION RECEIPT VIEW (PART F)
  // ════════════════════════════════════════════════════════════════════════════
  if (createdReportCode && createdAccessSecret) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        {/* Receipt Header Banner */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700/60 text-emerald-600 dark:text-emerald-400 shadow-lg shadow-emerald-500/10 mb-2">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Laporan berhasil dikirim secara anonim.
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Tim investigator tidak menerima nama atau akun Anda. Simpan Nomor Laporan dan Kode Akses Rahasia untuk memantau perkembangan laporan.
          </p>
        </div>

        {/* Security Credential Card */}
        <div className="bg-white dark:bg-slate-900 border-2 border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-6 relative overflow-hidden">
          {/* Subtle Security Watermark Background */}
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Kredensial Pelacakan Rahasia
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Simpan nomor dan kunci rahasia ini untuk mengecek status atau membalas pesan investigator.
              </p>
            </div>
          </div>

          {/* 1. Report Code */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center justify-between">
              <span>NOMOR LAPORAN</span>
              {copiedCode && <span className="text-emerald-600 text-xs font-semibold">Tersalin!</span>}
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 font-mono text-base sm:text-lg font-extrabold tracking-wider text-slate-900 dark:text-white">
                {createdReportCode}
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(createdReportCode, 'code')}
                className="p-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-blue-200 dark:border-slate-700 transition-colors shrink-0 cursor-pointer"
                title="Salin Nomor Laporan"
              >
                {copiedCode ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* 2. Access Secret */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center justify-between">
              <span>KUNCI AKSES RAHASIA (SECRET KEY)</span>
              {copiedSecret && <span className="text-emerald-600 text-xs font-semibold">Tersalin!</span>}
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 font-mono text-sm sm:text-base font-bold tracking-wider text-slate-900 dark:text-white flex items-center justify-between overflow-x-auto">
                <span>{showSecret ? createdAccessSecret : '••••-••••-••••-••••-••••-••••'}</span>
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 focus:outline-none cursor-pointer"
                  title={showSecret ? 'Sembunyikan' : 'Tampilkan'}
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(createdAccessSecret, 'secret')}
                className="p-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-blue-200 dark:border-slate-700 transition-colors shrink-0 cursor-pointer"
                title="Salin Kunci Akses"
              >
                {copiedSecret ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Warning Alert */}
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Kunci ini tidak dapat dipulihkan jika hilang!</p>
              <p className="text-amber-800 dark:text-amber-300/90 leading-relaxed">
                Karena sistem WACT tidak menyimpan identitas Anda, kunci akses rahasia ini adalah satu-satunya cara bagi Anda untuk memantau status atau membalas pesan tim investigasi.
              </p>
            </div>
          </div>

          {/* Action Links */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <Link
              href={`/integrity/track?code=${encodeURIComponent(createdReportCode)}&secret=${encodeURIComponent(createdAccessSecret)}`}
              className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-md shadow-blue-500/20 text-center flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
            >
              <span>Pantau Status Laporan Sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              type="button"
              onClick={() => {
                setCreatedReportCode(null);
                setCreatedAccessSecret(null);
                setDescription('');
                setEstimatedLossStr('');
                setInvolvedParty('');
                setPhotoPreview(null);
                setPhotoBase64(null);
              }}
              className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm transition-colors cursor-pointer"
            >
              Buat Laporan Baru
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MAIN FORM VIEW (PART A & B)
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 sm:space-y-8 animate-fade-in min-w-0">
      {/* Auto-Open Announcement Modal (First visit in session per announcement version) */}
      <IntegrityAnnouncementModal
        announcement={announcement}
        isOpen={isAnnouncementModalOpen}
        onClose={handleCloseAnnouncementModal}
        onOpenTrustModal={() => setIsTrustModalOpen(true)}
      />

      {/* Trust Explainer Modal */}
      <IntegrityTrustModal
        isOpen={isTrustModalOpen}
        onClose={() => setIsTrustModalOpen(false)}
      />

      {/* Hero Header Section */}
      <div className="text-center space-y-2.5 sm:space-y-3 px-1 sm:px-0">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {/* Primary Trust Trigger (Part A) */}
          <button
            type="button"
            onClick={() => setIsTrustModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold shadow-xs hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-all cursor-pointer group min-h-[38px] max-w-full text-center"
          >
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform shrink-0" />
            <span className="truncate">Lihat bagaimana anonimitas bekerja</span>
          </button>
        </div>

        <h1 className="text-2xl min-[390px]:text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight break-words">
          Laporkan Pelanggaran Integritas
        </h1>
        <p className="text-xs min-[390px]:text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
          Bantu wujudkan operasional gudang yang bersih, tertib, dan aman. Identitas Anda tidak dicatat oleh sistem WACT.
        </p>

        {/* Secondary Smaller Trust Trigger (Part A) */}
        <div>
          <button
            type="button"
            onClick={() => setIsTrustModalOpen(true)}
            className="inline-flex items-center justify-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold hover:underline cursor-pointer min-h-[36px]"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Pelajari perlindungan privasi</span>
          </button>
        </div>
      </div>

      {/* Dynamic Announcement Banner (Part G) */}
      {announcement && (
        <IntegrityAnnouncementBanner
          announcement={announcement}
          onOpenModal={() => setIsAnnouncementModalOpen(true)}
        />
      )}

      {/* 3-Point Privacy & Compliance Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3.5 w-full">
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center md:items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">100% Tanpa Identitas</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
              Tidak ada akun, IP, atau user-agent yang disimpan.
            </p>
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center md:items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Sanitasi Metadata</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
              EXIF & GPS foto otomatis dibersihkan dari server.
            </p>
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center md:items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Investigasi Terpisah</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
              Hanya dapat diakses tim investigasi integritas.
            </p>
          </div>
        </div>
      </div>

      {/* Main Submission Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 min-[390px]:p-5 sm:p-8 shadow-sm dark:shadow-none space-y-6 sm:space-y-7 transition-colors w-full min-w-0 max-w-full"
      >
        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 sm:p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-3 animate-shake">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <p className="font-medium break-words">{errorMessage}</p>
          </div>
        )}

        {/* ── STEP 1: LOKASI GUDANG ────────────────────────────────────────── */}
        <div className="space-y-3 w-full min-w-0 max-w-full">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>1. Lokasi Gudang Terkait <span className="text-rose-500">*</span></span>
            </label>
            <span className="text-[10.5px] sm:text-[11px] text-slate-500 truncate">Pilih unit</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 w-full min-w-0 max-w-full">
            {warehouses.map((wh) => {
              const isSelected = selectedWarehouseId === wh.id;
              return (
                <button
                  key={wh.id}
                  type="button"
                  onClick={() => setSelectedWarehouseId(wh.id)}
                  className={cn(
                    'p-3.5 sm:p-4 rounded-xl border text-left transition-all flex items-center justify-between group cursor-pointer min-h-[56px] w-full min-w-0 max-w-full box-border',
                    isSelected
                      ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 dark:bg-blue-950/40 dark:border-blue-500 dark:ring-blue-500/30'
                      : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs transition-colors shrink-0',
                        isSelected
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      )}
                    >
                      {wh.code}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white break-words">
                        {wh.name}
                      </h4>
                      <p className="text-[10.5px] sm:text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span>Unit Operasional {wh.code}</span>
                      </p>
                    </div>
                  </div>

                  <div
                    className={cn(
                      'w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ml-3',
                      isSelected
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-300 dark:border-slate-700'
                    )}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── STEP 2: KATEGORI PELANGGARAN ─────────────────────────────────── */}
        <div className="space-y-3 w-full min-w-0 max-w-full">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>2. Kategori Pelanggaran <span className="text-rose-500">*</span></span>
            </label>
            <span className="text-[10.5px] sm:text-[11px] text-slate-500 truncate">Pilih jenis</span>
          </div>

          <div className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 w-full min-w-0 max-w-full">
            {(Object.keys(INTEGRITY_CATEGORIES) as IntegrityCategory[]).map((catKey) => {
              const meta = INTEGRITY_CATEGORIES[catKey];
              const uiMeta = CATEGORY_UI_META[catKey];
              const IconComp = uiMeta.icon;
              const isSelected = selectedCategory === catKey;

              return (
                <button
                  key={catKey}
                  type="button"
                  onClick={() => setSelectedCategory(catKey)}
                  className={cn(
                    'p-3 sm:p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between group relative overflow-hidden min-h-[96px] sm:min-h-[105px] h-full w-full min-w-0 max-w-full box-border cursor-pointer',
                    isSelected
                      ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 dark:bg-blue-950/40 dark:border-blue-500 dark:ring-blue-500/30'
                      : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  )}
                >
                  <div className="flex items-start justify-between w-full min-w-0 mb-1.5 sm:mb-2">
                    <div
                      className={cn(
                        'w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105',
                        uiMeta.iconBg,
                        uiMeta.iconColor
                      )}
                    >
                      <IconComp className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                    </div>

                    <div
                      className={cn(
                        'w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ml-2',
                        isSelected
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-300 dark:border-slate-700'
                      )}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </div>

                  <div className="w-full min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight break-words">
                      {meta.label}
                    </h4>
                    <p className="text-[10px] sm:text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1 line-clamp-2 leading-relaxed break-words">
                      {meta.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── STEP 3: KRONOLOGI & DETAIL KEJADIAN ───────────────────────────── */}
        <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800 w-full min-w-0 max-w-full">
          <label className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>3. Kronologi & Detail Kejadian</span>
          </label>

          {/* Row 1: Tanggal & Waktu Kejadian (1-col on mobile, 2-col on desktop) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 w-full min-w-0 max-w-full">
            <div className="space-y-1.5 w-full min-w-0 max-w-full">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Tanggal Kejadian (Opsional)</span>
              </label>
              <input
                type="date"
                value={incidentDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="block w-full max-w-full min-w-0 box-border bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
              />
            </div>

            <div className="space-y-1.5 w-full min-w-0 max-w-full">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Waktu Kejadian (Opsional)</span>
              </label>
              <input
                type="time"
                value={incidentTime}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="block w-full max-w-full min-w-0 box-border bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
              />
            </div>
          </div>

          {/* Row 2: Estimasi Kerugian & Pihak Terlibat (1-col on mobile, 2-col on desktop) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 w-full min-w-0 max-w-full">
            <div className="space-y-1.5 w-full min-w-0 max-w-full">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Estimasi Nilai Kerugian (Opsional)</span>
              </label>
              <div className="relative w-full min-w-0 max-w-full">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                  Rp
                </span>
                <input
                  type="text"
                  placeholder="Contoh: 5.000.000"
                  value={estimatedLossStr}
                  onChange={(e) => setEstimatedLossStr(e.target.value)}
                  className="block w-full max-w-full min-w-0 box-border bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                />
              </div>
            </div>

            <div className="space-y-1.5 w-full min-w-0 max-w-full">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Pihak Terkait / Terduga / Vendor Terlibat (Opsional)</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: Vendor Ekspedisi X, Driver Plat B 1234 XX, atau shift malam"
                value={involvedParty}
                onChange={(e) => setInvolvedParty(e.target.value)}
                className="block w-full max-w-full min-w-0 box-border bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
              />
            </div>
          </div>

          {/* Row 3: Description Textarea */}
          <div className="space-y-2 w-full min-w-0 max-w-full">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Kronologi & Fakta Kejadian <span className="text-rose-500">*</span>
              </label>
              <span
                className={cn(
                  'text-[11px] font-mono',
                  description.trim().length >= 10
                    ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                    : 'text-slate-400'
                )}
              >
                {description.trim().length}/10 karakter min.
              </span>
            </div>
            <textarea
              rows={4}
              required
              placeholder="Jelaskan apa yang terjadi, lokasi spesifik di gudang (rak/zona/docking), barang atau dokumen terkait, dan bagaimana modus kejadian tersebut berlangsung..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="block w-full max-w-full min-w-0 box-border bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed placeholder:text-slate-400"
            />

            {/* Reporter Self-Identification Warning (Part E) */}
            <div className="p-3 rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 text-[11.5px] text-amber-800 dark:text-amber-300 flex items-start gap-2.5 w-full min-w-0 box-border">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed break-words">
                <strong>Peringatan Anonimitas:</strong> Untuk tetap anonim, jangan menuliskan nama, nomor karyawan, nomor telepon, atau informasi pribadi Anda sendiri di dalam kronologi.
              </p>
            </div>
          </div>
        </div>

        {/* ── STEP 4: BUKTI FOTO (OPSIONAL) ─────────────────────────────────── */}
        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Camera className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>4. Foto Bukti Pendukung (Opsional)</span>
            </label>
            <span className="text-[10.5px] px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-800/60">
              Auto-Sanitized EXIF
            </span>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePhotoSelect}
            className="hidden"
          />

          {!photoPreview ? (
            <button
              type="button"
              disabled={photoProcessing}
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 bg-slate-50/60 dark:bg-slate-950/40 hover:bg-blue-50/30 transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer"
            >
              {photoProcessing ? (
                <div className="flex items-center gap-2 text-xs text-blue-600 font-semibold">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Membersihkan metadata foto...</span>
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Klik untuk Unggah Foto Bukti
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      JPEG, PNG, atau WebP (Maks. 10MB)
                    </p>
                  </div>
                </>
              )}
            </button>
          ) : (
            <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-950 max-w-sm">
              <img
                src={photoPreview}
                alt="Pratinjau Bukti"
                className="w-full h-48 object-cover"
              />
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition-colors cursor-pointer"
                title="Hapus foto"
              >
                <XCircle className="w-4 h-4" />
              </button>
              <div className="p-2.5 bg-white dark:bg-slate-900 text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
                <span className="font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Foto Siap Dikirim
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-600 hover:underline font-medium cursor-pointer"
                >
                  Ganti Foto
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="submit"
            disabled={submitting || photoProcessing}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.005] cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Mengenkripsi & Mengirim Laporan...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Kirim Laporan Secara 100% Anonim</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
