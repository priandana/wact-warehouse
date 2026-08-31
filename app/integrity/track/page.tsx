// app/integrity/track/page.tsx
// Public Anonymous Report Tracking & Two-Way Communication Portal
// Validated by report_code + access_secret. Displays sanitized status & messaging thread.
// Modern executive visual styling supporting both Light and Dark themes.

'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
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
  INTEGRITY_STATUSES,
  INTEGRITY_SEVERITIES,
} from '@/lib/integrity/types';
import {
  trackAnonymousReport,
  sendAnonymousReply,
} from '@/lib/integrity/actions';
import { formatWib } from '@/lib/utils/dateFormat';
import { compressImage } from '@/lib/supabase/storage';

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

  // Auto-search if code & secret are present in query string
  useEffect(() => {
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
    if (!report || !replyText.trim()) return;

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
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      {/* ── 1. Header & Tracking Auth Form ────────────────────────────────── */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold shadow-xs">
          <Search className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Pelacakan Status & Saluran Komunikasi Terenkripsi</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Cek Status Laporan Anonim
        </h1>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
          Pantau perkembangan penanganan kasus dan berkomunikasi langsung dengan tim investigasi tanpa mengungkap identitas.
        </p>
      </div>

      {/* Tracking Form Card */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch();
        }}
        className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-5 shadow-sm dark:shadow-none transition-colors"
      >
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-800 dark:text-rose-200 flex items-center gap-2.5 animate-shake">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Nomor Laporan
            </label>
            <input
              type="text"
              value={reportCode}
              onChange={(e) => setReportCode(e.target.value.toUpperCase())}
              placeholder="Contoh: INT-PDL-8K2M4X"
              className="w-full py-2.5 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-blue-600 dark:text-blue-400 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Kode Akses Rahasia
            </label>
            <input
              type="text"
              value={accessSecret}
              onChange={(e) => setAccessSecret(e.target.value)}
              placeholder="Contoh: WACT-INT-XXXX-XXXX-XXXX-XXXX"
              className="w-full py-2.5 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.005]"
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
        <div className="space-y-6 animate-fade-in">
          {/* Main Status Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-none transition-colors">
            {/* Top Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-wide">
                    {report.report_code}
                  </span>
                  <span className={cn('text-xs font-extrabold px-3 py-0.5 rounded-full border', INTEGRITY_STATUSES[report.status].badgeClass)}>
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
                className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
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

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center">
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
                          ? 'bg-blue-600 text-white shadow-xs'
                          : isPassed
                          ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                          : 'text-slate-400 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60'
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
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Kategori Pelanggaran
                  </span>
                  <p className="font-bold text-slate-900 dark:text-white">{report.category_label}</p>
                </div>

                {report.estimated_loss && (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 space-y-1">
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
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Kronologi Kejadian yang Dilaporkan
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {report.description}
                </p>
              </div>

              {/* Resolution Notes if Resolved */}
              {report.resolution_notes && (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 space-y-1">
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-none transition-colors">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Percakapan Langsung dengan Tim Investigasi
                </h2>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {report.messages.length} Pesan
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Tim investigasi dapat mengirimkan pertanyaan klarifikasi di bawah ini. Anda dapat membalas dan mengirimkan bukti tambahan tanpa mengungkapkan identitas Anda.
            </p>

            {/* Message List */}
            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              {report.messages.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 text-center text-xs text-slate-500 space-y-1">
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
                          ? 'bg-blue-50/90 border border-blue-200 text-blue-950 dark:bg-blue-950/40 dark:border-blue-800/50 dark:text-blue-200 ml-4 sm:ml-8'
                          : 'bg-slate-50 border border-slate-200/90 text-slate-800 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300 mr-4 sm:mr-8'
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
                              className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 group cursor-pointer"
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

            {/* Reply Input Form */}
            <form onSubmit={handleSendReply} className="pt-2 space-y-3">
              {replySuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
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
                <div className="relative inline-block rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-950">
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

              <div className="flex items-start gap-2">
                <textarea
                  rows={2}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Tulis pesan balasan atau informasi tambahan untuk tim investigasi..."
                  className="flex-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                />

                <button
                  type="button"
                  disabled={photoProcessing}
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-emerald-600 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                  title="Lampirkan Foto Bukti Tambahan"
                >
                  <Camera className="w-5 h-5" />
                </button>

                <button
                  type="submit"
                  disabled={sendingReply || !replyText.trim() || photoProcessing}
                  className="p-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center shrink-0 cursor-pointer"
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
