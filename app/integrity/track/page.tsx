// app/integrity/track/page.tsx
// Public Anonymous Report Tracking & Two-Way Communication Portal
// Validated by report_code + access_secret. Displays sanitized status & messaging thread.
// Modern executive visual styling supporting both Light and Dark themes.

'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Lock,
  Building2,
  Calendar,
  Send,
  Camera,
  XCircle,
  Loader2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  MessageSquare,
  Paperclip,
  Shield,
  User,
  ArrowRight,
  Maximize2,
  X,
  RefreshCw,
  MapPin,
  FileText,
  DollarSign,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import {
  type PublicTrackedReport,
  type PublicAnnouncementDisplay,
  INTEGRITY_STATUSES,
  INTEGRITY_SEVERITIES,
  isIntegrityReportClosed,
} from '@/lib/integrity/types';
import {
  trackAnonymousReport,
  sendAnonymousReply,
  getPublicIntegrityAnnouncement,
} from '@/lib/integrity/actions';
import { formatWib } from '@/lib/utils/dateFormat';
import { compressImage } from '@/lib/supabase/storage';
import { IntegrityAnnouncementBanner } from '@/components/integrity/IntegrityAnnouncementBanner';

function TrackContent() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code') || '';
  const initialSecret = searchParams.get('secret') || '';

  const [reportCode, setReportCode] = useState(initialCode);
  const [accessSecret, setAccessSecret] = useState(initialSecret);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Loaded report data
  const [report, setReport] = useState<PublicTrackedReport | null>(null);

  // Announcement state
  const [announcement, setAnnouncement] = useState<PublicAnnouncementDisplay | null>(null);

  // Reply form state
  const [replyText, setReplyText] = useState('');
  const [replyPhotoPreview, setReplyPhotoPreview] = useState<string | null>(null);
  const [replyPhotoBase64, setReplyPhotoBase64] = useState<string | null>(null);
  const [replyPhotoMimeType, setReplyPhotoMimeType] = useState<string | null>(null);
  const [sendingReply, setSendingReply] = useState(false);
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const [replySuccess, setReplySuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fullscreen photo modal state
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);

  // Auto-search & load announcement on mount
  useEffect(() => {
    async function loadAnnouncement() {
      try {
        const ann = await getPublicIntegrityAnnouncement('track');
        if (ann) setAnnouncement(ann);
      } catch {
        // fallback
      }
    }
    loadAnnouncement();

    if (initialCode && initialSecret) {
      handleSearch(initialCode, initialSecret);
    }
  }, [initialCode, initialSecret]);

  const handleSearch = async (codeToSearch = reportCode, secretToSearch = accessSecret) => {
    if (!codeToSearch.trim() || !secretToSearch.trim()) {
      setErrorMessage('Nomor laporan dan kode akses rahasia wajib diisi.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await trackAnonymousReport(codeToSearch.trim(), secretToSearch.trim());
      if (res.success && res.data) {
        setReport(res.data);
      } else {
        setReport(null);
        setErrorMessage(res.error || 'Nomor laporan atau kode akses tidak valid.');
      }
    } catch {
      setErrorMessage('Terjadi kendala saat memeriksa laporan.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('File harus berupa foto.');
      return;
    }

    setPhotoProcessing(true);
    try {
      const { blob, contentType } = await compressImage(file, 1920, 0.82);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = (reader.result as string).split(',')[1];
        setReplyPhotoBase64(base64data);
        setReplyPhotoMimeType(contentType);
        setReplyPhotoPreview(URL.createObjectURL(blob));
        setPhotoProcessing(false);
      };
      reader.readAsDataURL(blob);
    } catch {
      setPhotoProcessing(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!report || !replyText.trim() || isIntegrityReportClosed(report.status)) return;

    setSendingReply(true);
    setErrorMessage(null);

    try {
      const res = await sendAnonymousReply(
        report.report_code,
        accessSecret.trim(),
        replyText.trim(),
        replyPhotoBase64,
        replyPhotoMimeType,
        'Foto lampiran pelapor anonim'
      );

      if (res.success) {
        setReplyText('');
        setReplyPhotoPreview(null);
        setReplyPhotoBase64(null);
        setReplySuccess(true);
        setTimeout(() => setReplySuccess(false), 3000);
        // Refresh report
        await handleSearch(report.report_code, accessSecret.trim());
      } else {
        setErrorMessage(res.error || 'Gagal mengirim balasan.');
      }
    } catch {
      setErrorMessage('Gagal mengirim balasan.');
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 sm:space-y-8 animate-fade-in min-w-0">
      {/* ── 1. Header & Tracking Auth Form ────────────────────────────────── */}
      <div className="text-center space-y-2.5 sm:space-y-3 px-1 sm:px-0">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full neu-inset-sm bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-bold max-w-full truncate">
          <Search className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="truncate">Pelacakan Status & Saluran Komunikasi Terenkripsi</span>
        </div>

        <h1 className="text-2xl min-[390px]:text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight break-words">
          Cek Status Laporan Anonim
        </h1>

        <p className="text-xs min-[390px]:text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
          Pantau perkembangan penanganan kasus dan berkomunikasi langsung dengan tim investigasi tanpa mengungkap identitas.
        </p>
      </div>

      {/* Dynamic Announcement Banner (Part G) */}
      {announcement && <IntegrityAnnouncementBanner announcement={announcement} />}

      {/* Tracking Form Card */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch();
        }}
        className="bg-[#EEF2F7] dark:bg-[#131C31] border border-black/[0.04] dark:border-white/[0.05] neu-raised rounded-2xl sm:rounded-3xl p-4 min-[390px]:p-5 sm:p-8 space-y-4 sm:space-y-5 transition-colors w-full min-w-0 max-w-full"
      >
        {errorMessage && (
          <div className="p-3.5 sm:p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-800 dark:text-rose-200 flex items-start sm:items-center gap-2.5 animate-shake">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5 sm:mt-0" />
            <span className="break-words">{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full">
          <div className="space-y-1.5 min-w-0">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Nomor Laporan
            </label>
            <input
              type="text"
              value={reportCode}
              onChange={(e) => setReportCode(e.target.value.toUpperCase())}
              placeholder="Contoh: INT-PDL-8K2M4X"
              className="w-full py-2.5 px-3.5 rounded-xl neu-inset text-xs font-mono font-bold text-blue-600 dark:text-blue-400 placeholder:text-slate-400 focus:outline-hidden min-h-[44px]"
              required
            />
          </div>

          <div className="space-y-1.5 min-w-0">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Kode Akses Rahasia
            </label>
            <input
              type="text"
              value={accessSecret}
              onChange={(e) => setAccessSecret(e.target.value)}
              placeholder="Contoh: WACT-INT-XXXX-XXXX-XXXX-XXXX"
              className="w-full py-2.5 px-3.5 rounded-xl neu-inset text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 placeholder:text-slate-400 focus:outline-hidden min-h-[44px]"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 sm:py-3.5 px-5 rounded-xl sm:rounded-2xl fintech-btn-primary font-bold text-xs sm:text-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Memverifikasi Kredensial...</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span>Periksa Status & Riwayat Laporan</span>
            </>
          )}
        </button>
      </form>

      {/* ── 2. Verified Report Details ────────────────────────────────────── */}
      {report && (
        <div className="space-y-5 sm:space-y-6 animate-fade-in w-full min-w-0">
          {/* Main Status Card */}
          <div className="bg-[#EEF2F7] dark:bg-[#131C31] border border-black/[0.04] dark:border-white/[0.05] neu-raised rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-6 transition-colors">
            {/* Top Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.04] dark:border-white/[0.05] pb-5">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-wide">
                    {report.report_code}
                  </span>
                  <span className={cn('text-xs font-extrabold px-3 py-1 rounded-full border shadow-xs', INTEGRITY_STATUSES[report.status].badgeClass)}>
                    {report.status_label}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{report.warehouse_name} ({report.warehouse_code})</span>
                  </span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatWib(report.created_at, 'dd MMM yyyy, HH:mm')} WIB</span>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSearch()}
                disabled={loading}
                className="neu-btn-secondary py-2 px-3 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                title="Perbarui Data"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
                <span>Refresh</span>
              </button>
            </div>

            {/* Status Stepper Tracker */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Tahapan Penanganan Investigasi</span>
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-2xl neu-inset-sm bg-[#E5EBF3] dark:bg-[#0D1322] border border-black/[0.04] dark:border-white/[0.05] text-center">
                {[
                  { key: 'submitted', label: '1. Diterima' },
                  { key: 'triage', label: '2. Triase / Penelaahan' },
                  { key: 'investigating', label: '3. Investigasi Aktif' },
                  { key: 'resolved', label: '4. Selesai' },
                ].map((step) => {
                  const statusOrder = ['submitted', 'triage', 'investigating', 'action_required', 'resolved', 'unsubstantiated', 'duplicate'];
                  const currentIndex = statusOrder.indexOf(report.status);
                  const stepIndex = statusOrder.indexOf(step.key);
                  const isPassed = currentIndex >= stepIndex;
                  const isCurrent = report.status === step.key;

                  return (
                    <div
                      key={step.key}
                      className={cn(
                        'p-2.5 rounded-xl text-xs font-bold transition-all',
                        isCurrent
                          ? 'fintech-btn-primary text-white shadow-xs'
                          : isPassed
                          ? 'neu-raised-sm bg-blue-500/15 text-blue-800 dark:text-blue-300'
                          : 'neu-raised-sm text-slate-400 bg-[#EEF2F7] dark:bg-[#131C31] border border-black/[0.03] dark:border-white/[0.03]'
                      )}
                    >
                      <p className="text-[11.5px] truncate">{step.label}</p>
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed px-1">
                {INTEGRITY_STATUSES[report.status].description}
              </p>
            </div>

            {/* Report Details Accordion/Summary */}
            <div className="space-y-3 pt-2 border-t border-black/[0.04] dark:border-white/[0.05]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl neu-raised-sm bg-[#EEF2F7] dark:bg-[#131C31] border border-black/[0.04] dark:border-white/[0.05] space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Kategori Pelanggaran
                  </span>
                  <p className="font-bold text-slate-900 dark:text-white">{report.category_label}</p>
                </div>

                {report.estimated_loss && (
                  <div className="p-3.5 rounded-xl neu-raised-sm bg-[#EEF2F7] dark:bg-[#131C31] border border-black/[0.04] dark:border-white/[0.05] space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Estimasi Nilai Kerugian
                    </span>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">
                      Rp {report.estimated_loss.toLocaleString('id-ID')}
                    </p>
                  </div>
                )}
              </div>

              {/* Chronology text */}
              <div className="p-4 rounded-xl neu-inset-sm bg-[#EEF2F7] dark:bg-[#0D1322] border border-black/[0.04] dark:border-white/[0.05] space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Kronologi Kejadian yang Dilaporkan
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {report.description}
                </p>
              </div>

              {/* Resolution Notes if Resolved */}
              {report.resolution_notes && (
                <div className="p-4 rounded-xl neu-raised-sm bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Catatan Hasil Penanganan & Kesimpulan Investigasi</span>
                  </div>
                  <p className="text-xs leading-relaxed text-emerald-800 dark:text-emerald-200/90 whitespace-pre-wrap pl-5">
                    {report.resolution_notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── 3. Two-Way Anonymous Conversation Thread ──────────────────── */}
          <div className="bg-[#EEF2F7] dark:bg-[#131C31] border border-black/[0.04] dark:border-white/[0.05] neu-raised rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-6 transition-colors">
            <div className="flex items-center justify-between border-b border-black/[0.04] dark:border-white/[0.05] pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl neu-icon-well bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Percakapan Langsung dengan Tim Investigasi
                </h2>
              </div>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full neu-inset-sm text-slate-700 dark:text-slate-300">
                {report.messages.length} Pesan
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Tim investigasi dapat mengirimkan pertanyaan klarifikasi di bawah ini. Anda dapat membalas dan mengirimkan bukti tambahan tanpa mengungkapkan identitas Anda.
            </p>

            {/* Message List */}
            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              {report.messages.length === 0 ? (
                <div className="p-6 rounded-2xl neu-inset-sm bg-[#E5EBF3] dark:bg-[#0D1322] border border-black/[0.04] dark:border-white/[0.05] text-center text-xs text-slate-500 space-y-1">
                  <MessageSquare className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Belum ada pesan dari tim investigasi.</p>
                  <p className="text-[11px] text-slate-500">
                    Jika ada informasi atau foto tambahan, Anda dapat mengirimkannya melalui formulir di bawah.
                  </p>
                </div>
              ) : (
                report.messages.map((msg) => {
                  const isReporter = msg.sender_type === 'anonymous_reporter';
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        'p-4 rounded-2xl space-y-2 text-xs transition-all',
                        isReporter
                          ? 'neu-raised-sm bg-blue-500/10 border border-blue-500/20 text-blue-950 dark:text-blue-200 ml-4 sm:ml-8'
                          : 'neu-raised-sm bg-[#EEF2F7] border border-black/[0.04] dark:border-white/[0.05] text-slate-800 dark:bg-[#0D1322] dark:text-slate-300 mr-4 sm:mr-8'
                      )}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold flex items-center gap-1.5">
                          {isReporter ? (
                            <>
                              <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                              <span className="text-blue-700 dark:text-blue-300">Anda (Pelapor Anonim)</span>
                            </>
                          ) : (
                            <>
                              <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-emerald-700 dark:text-emerald-400 font-bold">Tim Penyelidik Integritas</span>
                            </>
                          )}
                        </span>
                        <span className="text-slate-400 dark:text-slate-500 font-mono text-[10px]">
                          {formatWib(msg.created_at, 'dd MMM, HH:mm')}
                        </span>
                      </div>

                      <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>

                      {/* Evidence attached to message */}
                      {msg.evidences && msg.evidences.length > 0 && (
                        <div className="pt-2 flex flex-wrap gap-2">
                          {msg.evidences.map((ev) => (
                            <button
                              key={ev.id}
                              type="button"
                              onClick={() => setSelectedPhotoUrl(ev.signed_url)}
                              className="relative w-20 h-20 rounded-xl overflow-hidden border border-black/[0.06] dark:border-white/[0.06] neu-raised-sm bg-[#EEF2F7] dark:bg-[#0D1322] group cursor-pointer"
                            >
                              <img src={ev.signed_url} alt="Lampiran" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                <Maximize2 className="w-4 h-4" />
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Conditional Reply Form or Terminal Closure Notice */}
            {isIntegrityReportClosed(report.status) ? (
              <div className="pt-3 border-t border-black/[0.04] dark:border-white/[0.05]">
                <div className="p-4 sm:p-5 rounded-2xl neu-inset-sm bg-[#EEF2F7] dark:bg-[#0D1322] border border-black/[0.04] dark:border-white/[0.05] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl neu-icon-well bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Investigasi telah selesai
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Percakapan ditutup karena laporan ini telah selesai ditangani. Jika Anda ingin melaporkan kejadian baru, silakan buat laporan baru.
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/integrity/report"
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl neu-btn-secondary text-blue-700 dark:text-blue-300 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shrink-0 touch-target"
                  >
                    <span>Buat Laporan Baru</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              /* Reply Input Form */
              <form onSubmit={handleSendReply} className="pt-2 space-y-3">
                {replySuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Pesan balasan berhasil terkirim secara aman & anonim.</span>
                  </div>
                )}

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  ref={fileInputRef}
                  onChange={handlePhotoSelect}
                  className="hidden"
                />

                {replyPhotoPreview && (
                  <div className="relative inline-block rounded-xl overflow-hidden border border-black/[0.05] dark:border-white/[0.05] neu-inset-sm bg-[#EEF2F7] dark:bg-[#0D1322]">
                    <img src={replyPhotoPreview} alt="Preview" className="w-24 h-24 object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setReplyPhotoPreview(null);
                        setReplyPhotoBase64(null);
                        setReplyPhotoMimeType(null);
                      }}
                      className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/90 text-white hover:bg-rose-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="flex items-start gap-2 w-full min-w-0 max-w-full box-border">
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Tulis pesan balasan atau informasi tambahan untuk tim investigasi..."
                    className="flex-1 min-w-0 max-w-full box-border p-3 rounded-xl neu-inset text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden leading-relaxed min-h-[44px]"
                  />

                  <button
                    type="button"
                    disabled={photoProcessing}
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 rounded-xl neu-icon-well text-slate-600 dark:text-slate-400 hover:text-emerald-600 transition-colors flex items-center justify-center shrink-0 cursor-pointer min-h-[44px] min-w-[44px]"
                    title="Lampirkan Foto Bukti Tambahan"
                  >
                    <Camera className="w-5 h-5" />
                  </button>

                  <button
                    type="submit"
                    disabled={sendingReply || !replyText.trim() || photoProcessing}
                    className="p-3 rounded-xl fintech-btn-primary font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center shrink-0 cursor-pointer min-h-[44px] min-w-[44px]"
                    title="Kirim Balasan Anonim"
                  >
                    {sendingReply ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── 4. Fullscreen Photo Lightbox Modal ────────────────────────────── */}
      {selectedPhotoUrl && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSelectedPhotoUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setSelectedPhotoUrl(null)}
              className="absolute -top-10 right-0 p-2 rounded-full bg-slate-800 text-white hover:bg-rose-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedPhotoUrl}
              alt="Foto Bukti"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function PublicIntegrityTrackPage() {
  return (
    <Suspense fallback={
      <div className="p-8 text-center text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" />
      </div>
    }>
      <TrackContent />
    </Suspense>
  );
}
