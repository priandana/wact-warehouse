// components/integrity/IntegrityDetailClient.tsx
// Comprehensive Investigator Detail Interface for WACT Integrity Center

'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield,
  ShieldAlert,
  ArrowLeft,
  Calendar,
  Building2,
  DollarSign,
  Users,
  Clock,
  MessageSquare,
  FileText,
  Camera,
  Send,
  UserCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Tag,
  Maximize2,
  X,
  History,
  Lock,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import {
  type IntegrityReport,
  type IntegrityStatus,
  type IntegritySeverity,
  type IntegrityCategory,
  INTEGRITY_CATEGORIES,
  INTEGRITY_STATUSES,
  INTEGRITY_SEVERITIES,
} from '@/lib/integrity/types';
import {
  updateReportStatus,
  changeReportSeverity,
  assignInvestigator,
  sendInvestigatorMessage,
  addInternalNote,
  uploadInvestigatorEvidence,
} from '@/lib/integrity/actions';
import { formatWib } from '@/lib/utils/dateFormat';
import { compressImage } from '@/lib/supabase/storage';

interface InvestigatorCandidate {
  id: string;
  full_name: string;
  role_display_name?: string;
}

interface IntegrityDetailClientProps {
  report: IntegrityReport;
  candidates: InvestigatorCandidate[];
  currentUserId: string;
}

export function IntegrityDetailClient({
  report,
  candidates,
  currentUserId,
}: IntegrityDetailClientProps) {
  const router = useRouter();

  // Active tab in center panel
  const [activeTab, setActiveTab] = useState<'messages' | 'notes' | 'activities'>('messages');

  // Messages state
  const [msgInput, setMsgInput] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Internal Notes state
  const [noteInput, setNoteInput] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Modals state
  const [activeModal, setActiveModal] = useState<
    'assign' | 'severity' | 'status' | 'resolve' | null
  >(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(
    report.assigned_investigator_id || ''
  );
  const [targetSeverity, setTargetSeverity] = useState<IntegritySeverity>(report.severity);
  const [targetStatus, setTargetStatus] = useState<IntegrityStatus>(report.status);
  const [resolutionNotes, setResolutionNotes] = useState(report.resolution_notes || '');
  const [resolutionAction, setResolutionAction] = useState(report.resolution_action || '');

  // Loading & error states
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Evidence upload
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Message photo attachment
  const [msgPhotoPreview, setMsgPhotoPreview] = useState<string | null>(null);
  const [msgPhotoBase64, setMsgPhotoBase64] = useState<string | null>(null);
  const [msgPhotoMimeType, setMsgPhotoMimeType] = useState<string | null>(null);
  const [processingMsgPhoto, setProcessingMsgPhoto] = useState(false);
  const msgFileInputRef = useRef<HTMLInputElement>(null);

  // Photo viewer modal
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);

  const statusMeta = INTEGRITY_STATUSES[report.status];
  const severityMeta = INTEGRITY_SEVERITIES[report.severity];
  const categoryMeta = INTEGRITY_CATEGORIES[report.category];

  // ── Action Handlers ─────────────────────────────────────────────────────────

  const handleMsgPhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessingMsgPhoto(true);
    try {
      const { blob, contentType } = await compressImage(file, 1920, 0.82);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        setMsgPhotoBase64(base64);
        setMsgPhotoMimeType(contentType);
        setMsgPhotoPreview(URL.createObjectURL(blob));
        setProcessingMsgPhoto(false);
      };
      reader.readAsDataURL(blob);
    } catch {
      setProcessingMsgPhoto(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgInput.trim() && !msgPhotoBase64) return;

    setSendingMsg(true);
    try {
      const res = await sendInvestigatorMessage(
        report.id,
        report.warehouse_id,
        msgInput.trim() || 'Lampiran foto bukti dari tim investigasi.',
        msgPhotoBase64,
        msgPhotoMimeType,
        'Foto lampiran dari tim investigasi'
      );
      if (res.success) {
        setMsgInput('');
        setMsgPhotoPreview(null);
        setMsgPhotoBase64(null);
        setMsgPhotoMimeType(null);
        router.refresh();
      }
    } catch {
      // ignore
    } finally {
      setSendingMsg(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInput.trim()) return;

    setAddingNote(true);
    try {
      const res = await addInternalNote(report.id, report.warehouse_id, noteInput.trim());
      if (res.success) {
        setNoteInput('');
        router.refresh();
      }
    } catch {
      // ignore
    } finally {
      setAddingNote(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const { blob, contentType } = await compressImage(file, 1920, 0.82);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const res = await uploadInvestigatorEvidence(
          report.id,
          report.warehouse_id,
          base64,
          contentType,
          'Foto bukti temuan investigasi'
        );
        if (res.success) {
          router.refresh();
        }
        setUploadingPhoto(false);
      };
      reader.readAsDataURL(blob);
    } catch {
      setUploadingPhoto(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedCandidateId) return;
    setModalLoading(true);
    setModalError(null);
    try {
      const res = await assignInvestigator(report.id, report.warehouse_id, selectedCandidateId);
      if (res.success) {
        setActiveModal(null);
        router.refresh();
      } else {
        setModalError(res.error || 'Gagal menugaskan.');
      }
    } finally {
      setModalLoading(false);
    }
  };

  const handleChangeSeverity = async () => {
    setModalLoading(true);
    setModalError(null);
    try {
      const res = await changeReportSeverity(report.id, report.warehouse_id, targetSeverity);
      if (res.success) {
        setActiveModal(null);
        router.refresh();
      } else {
        setModalError(res.error || 'Gagal mengubah severity.');
      }
    } finally {
      setModalLoading(false);
    }
  };

  const handleStatusChange = async (status: IntegrityStatus) => {
    setModalLoading(true);
    setModalError(null);
    try {
      const res = await updateReportStatus(
        report.id,
        report.warehouse_id,
        status,
        resolutionNotes,
        resolutionAction
      );
      if (res.success) {
        setActiveModal(null);
        router.refresh();
      } else {
        setModalError(res.error || 'Gagal memperbarui status.');
      }
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="page-padding py-4 sm:py-5 max-w-6xl mx-auto space-y-6">
      {/* ── 1. Top Navigation & Status Banner ────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/integrity"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs"
            title="Kembali ke Daftar Laporan Integritas"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-slate-900 font-mono">
                {report.report_code}
              </h1>
              <span className={cn('text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border', statusMeta.badgeClass)}>
                {statusMeta.label}
              </span>
              <span className={cn('text-[10px] font-extrabold px-2 py-0.5 rounded-full border flex items-center gap-1', severityMeta.badgeClass)}>
                <span className={cn('w-1.5 h-1.5 rounded-full', severityMeta.dotColor)} />
                <span>{severityMeta.label}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {categoryMeta?.label || report.category} &bull; {report.warehouse_name || 'Gudang'}
            </p>
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Change Severity Button */}
          <button
            type="button"
            onClick={() => {
              setTargetSeverity(report.severity);
              setModalError(null);
              setActiveModal('severity');
            }}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
          >
            <Tag className="w-3.5 h-3.5 text-slate-500" />
            <span>Ubah Severity</span>
          </button>

          {/* Assign Investigator Button */}
          <button
            type="button"
            onClick={() => {
              setSelectedCandidateId(report.assigned_investigator_id || '');
              setModalError(null);
              setActiveModal('assign');
            }}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
          >
            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>{report.assigned_investigator_name ? 'Reassign' : 'Tugaskan Penyelidik'}</span>
          </button>

          {/* Resolve / Status Button */}
          {report.status !== 'resolved' && report.status !== 'unsubstantiated' && report.status !== 'duplicate' ? (
            <button
              type="button"
              onClick={() => {
                setTargetStatus('resolved');
                setModalError(null);
                setActiveModal('resolve');
              }}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Selesaikan Investigasi</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setTargetStatus('investigating');
                setModalError(null);
                setActiveModal('status');
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Buka Investigasi Ulang</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 2. Two-Column Grid Layout ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Case Overview, Parties, Evidences (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Incident Summary Card */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-4 shadow-2xs">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Informasi Kejadian
            </h2>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Kronologi Dilaporkan
                </span>
                <p className="text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">
                  {report.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-0.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Waktu Kejadian
                  </span>
                  <p className="font-bold text-slate-800">
                    {report.incident_datetime
                      ? formatWib(report.incident_datetime, 'dd MMM yyyy, HH:mm')
                      : 'Tidak disebutkan'}
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-0.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Estimasi Kerugian
                  </span>
                  <p className="font-bold text-emerald-600">
                    {report.estimated_loss
                      ? `Rp ${report.estimated_loss.toLocaleString('id-ID')}`
                      : 'Tidak disebutkan'}
                  </p>
                </div>
              </div>

              {report.involved_party_description && (
                <div className="p-3 rounded-2xl bg-purple-50/60 border border-purple-200/70 space-y-1 text-purple-950">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>Informasi Dugaan Pihak Terkait</span>
                  </span>
                  <p className="text-xs leading-relaxed font-medium">
                    {report.involved_party_description}
                  </p>
                </div>
              )}

              {/* Investigator Assigned Box */}
              <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-200/70 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700">
                      Penyelidik Utama
                    </span>
                    <p className="text-xs font-bold text-blue-950">
                      {report.assigned_investigator_name || 'Belum ditugaskan'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Evidence Photos Gallery Card */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Foto Bukti Pendukung ({report.evidences?.length || 0})
              </h2>

              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handlePhotoUpload}
                className="hidden"
              />

              <button
                type="button"
                disabled={uploadingPhoto}
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors flex items-center gap-1 touch-target"
              >
                {uploadingPhoto ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Plus className="w-3 h-3" />
                )}
                <span>Tambah Bukti</span>
              </button>
            </div>

            {(!report.evidences || report.evidences.length === 0) ? (
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/60 text-center text-xs text-slate-400 space-y-1">
                <Camera className="w-5 h-5 mx-auto text-slate-300" />
                <p>Belum ada foto bukti terlampir.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {report.evidences.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => setSelectedPhotoUrl(ev.signedUrl || null)}
                    className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 group"
                  >
                    <img src={ev.signedUrl} alt={ev.file_name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                      <Maximize2 className="w-4 h-4" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Tabs (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Tab Switcher */}
          <div className="flex items-center p-1 bg-slate-100 border border-slate-200/80 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveTab('messages')}
              className={cn(
                'flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 touch-target',
                activeTab === 'messages'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Percakapan Anonim ({report.messages?.length || 0})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('notes')}
              className={cn(
                'flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 touch-target',
                activeTab === 'notes'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Catatan Internal ({report.internal_notes?.length || 0})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('activities')}
              className={cn(
                'flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 touch-target',
                activeTab === 'activities'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <History className="w-3.5 h-3.5" />
              <span>Audit Trail</span>
            </button>
          </div>

          {/* TAB 1: Anonymous Two-Way Messages */}
          {activeTab === 'messages' && (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-black text-slate-900">
                    Percakapan Langsung dengan Pelapor Anonim
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Pesan yang Anda kirimkan di sini dapat dibaca pelapor melalui portal pelacakan anonim.
                  </p>
                </div>
              </div>

              {/* Message List */}
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1 no-scrollbar">
                {(!report.messages || report.messages.length === 0) ? (
                  <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200/60 text-center text-xs text-slate-400 space-y-1">
                    <MessageSquare className="w-6 h-6 mx-auto text-slate-300" />
                    <p>Belum ada pesan dalam laporan ini.</p>
                    <p className="text-[11px] text-slate-400">
                      Gunakan kotak input di bawah untuk mengajukan pertanyaan klarifikasi ke pelapor.
                    </p>
                  </div>
                ) : (
                  report.messages.map((msg) => {
                    const isInvestigator = msg.sender_type === 'investigator';
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          'p-4 rounded-2xl space-y-2 text-xs transition-all',
                          isInvestigator
                            ? 'bg-blue-50/80 border border-blue-200/80 text-blue-950 ml-4 sm:ml-8'
                            : 'bg-slate-50 border border-slate-200 text-slate-800 mr-4 sm:mr-8'
                        )}
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-extrabold flex items-center gap-1.5">
                            {isInvestigator ? (
                              <>
                                <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span className="text-blue-700">Penyelidik Integritas</span>
                              </>
                            ) : (
                              <>
                                <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                <span className="text-slate-700 font-bold">Pelapor Anonim</span>
                              </>
                            )}
                          </span>
                          <span className="text-slate-400 font-mono text-[10px]">
                            {formatWib(msg.created_at, 'dd MMM, HH:mm')}
                          </span>
                        </div>

                        {msg.message && (
                          <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                        )}

                        {/* Inline Message-Linked Evidence Attachments */}
                        {msg.evidences && msg.evidences.length > 0 && (
                          <div className="pt-2 flex flex-wrap gap-2">
                            {msg.evidences.map((ev) => (
                              <button
                                key={ev.id}
                                type="button"
                                onClick={() => setSelectedPhotoUrl(ev.signedUrl || null)}
                                className="group relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-2xs cursor-pointer max-w-[240px] w-full aspect-[4/3] flex flex-col items-center justify-center transition-all active:scale-[0.98] hover:ring-2 hover:ring-blue-500/40"
                                title="Klik untuk memperbesar foto bukti"
                              >
                                <img
                                  src={ev.signedUrl}
                                  alt="Bukti Foto"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                />
                                <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                  <Maximize2 className="w-5 h-5 drop-shadow-md" />
                                </div>
                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-transparent p-2 text-left pointer-events-none">
                                  <span className="text-[10px] font-bold text-white/95 flex items-center gap-1">
                                    <Camera className="w-3 h-3 text-blue-400 shrink-0" />
                                    <span>Bukti Foto</span>
                                  </span>
                                  {ev.caption && ev.caption !== 'Foto tambahan dari pelapor' && (
                                    <p className="text-[9.5px] text-white/80 truncate mt-0.5">{ev.caption}</p>
                                  )}
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

              {/* Send Message Form */}
              <form onSubmit={handleSendMessage} className="pt-2 space-y-2">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  ref={msgFileInputRef}
                  onChange={handleMsgPhotoSelect}
                  className="hidden"
                />

                {msgPhotoPreview && (
                  <div className="relative inline-block rounded-xl overflow-hidden border border-slate-300 bg-slate-100">
                    <img src={msgPhotoPreview} alt="Preview" className="w-20 h-20 object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setMsgPhotoPreview(null);
                        setMsgPhotoBase64(null);
                        setMsgPhotoMimeType(null);
                      }}
                      className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/90 text-white hover:bg-rose-600 cursor-pointer"
                      title="Hapus foto"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                <div className="flex items-start gap-2">
                  <textarea
                    rows={2}
                    value={msgInput}
                    onChange={(e) => setMsgInput(e.target.value)}
                    placeholder="Kirim pertanyaan atau klarifikasi ke pelapor anonim..."
                    className="flex-1 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 leading-relaxed"
                  />

                  <button
                    type="button"
                    disabled={processingMsgPhoto}
                    onClick={() => msgFileInputRef.current?.click()}
                    className="p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 hover:text-blue-600 transition-colors flex items-center justify-center shrink-0 cursor-pointer touch-target"
                    title="Lampirkan Foto Bukti"
                  >
                    <Camera className="w-5 h-5" />
                  </button>

                  <button
                    type="submit"
                    disabled={sendingMsg || (!msgInput.trim() && !msgPhotoBase64) || processingMsgPhoto}
                    className="p-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95 disabled:opacity-50 transition-all touch-target flex items-center justify-center shrink-0 cursor-pointer"
                    title="Kirim Pesan"
                  >
                    {sendingMsg ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: Internal Investigator Notes */}
          {activeTab === 'notes' && (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Catatan Internal Tim Investigasi (Rahasia)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Hanya dapat dilihat oleh tim investigasi. <strong>Tidak dapat diakses</strong> oleh pelapor anonim.
                  </p>
                </div>
              </div>

              {/* Notes List */}
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1 no-scrollbar">
                {(!report.internal_notes || report.internal_notes.length === 0) ? (
                  <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200/60 text-center text-xs text-slate-400 space-y-1">
                    <FileText className="w-6 h-6 mx-auto text-slate-300" />
                    <p>Belum ada catatan internal.</p>
                  </div>
                ) : (
                  report.internal_notes.map((note) => (
                    <div
                      key={note.id}
                      className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-xs text-indigo-950 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold text-indigo-900">
                        <span>{note.author_name || 'Investigator'}</span>
                        <span className="text-slate-400 font-mono text-[10px]">
                          {formatWib(note.created_at, 'dd MMM yyyy, HH:mm')}
                        </span>
                      </div>
                      <p className="leading-relaxed whitespace-pre-wrap">{note.note}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Note Form */}
              <form onSubmit={handleAddNote} className="pt-2 flex items-start gap-2">
                <textarea
                  rows={2}
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Tambahkan catatan temuan rahasia tim investigasi..."
                  className="flex-1 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 leading-relaxed"
                />
                <button
                  type="submit"
                  disabled={addingNote || !noteInput.trim()}
                  className="p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 active:scale-95 disabled:opacity-50 transition-all touch-target flex items-center justify-center shrink-0"
                  title="Simpan Catatan"
                >
                  {addingNote ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: Activity Audit Trail */}
          {activeTab === 'activities' && (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-4 shadow-2xs">
              <h3 className="text-xs font-black text-slate-900 border-b border-slate-100 pb-3">
                Log Riwayat Investigasi (Audit Trail)
              </h3>

              <div className="space-y-3 max-h-96 overflow-y-auto pr-1 no-scrollbar">
                {(!report.activities || report.activities.length === 0) ? (
                  <p className="text-xs text-slate-400 text-center py-6">Belum ada riwayat aktivitas.</p>
                ) : (
                  report.activities.map((act) => (
                    <div
                      key={act.id}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-800">
                          {act.action.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        <span className="text-slate-400 font-mono text-[10px]">
                          {formatWib(act.created_at, 'dd MMM yyyy, HH:mm')}
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px]">
                        Aktor: {act.actor_name || (act.actor_type === 'anonymous_reporter' ? 'Pelapor Anonim' : 'Sistem')}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 3. Action Modals ──────────────────────────────────────────────── */}

      {/* Modal: Assign Investigator */}
      {activeModal === 'assign' && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-black text-slate-900">Tugaskan Penyelidik Integritas</h3>

            {modalError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {modalError}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Pilih Akun Penyelidik
              </label>
              <select
                value={selectedCandidateId}
                onChange={(e) => setSelectedCandidateId(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
              >
                <option value="">-- Pilih Penyelidik --</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} ({c.role_display_name || 'Staff'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                disabled={modalLoading}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleAssign}
                disabled={modalLoading || !selectedCandidateId}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 flex items-center justify-center gap-1.5"
              >
                {modalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                <span>Simpan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Change Severity */}
      {activeModal === 'severity' && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-black text-slate-900">Ubah Tingkat Keparahan (Severity)</h3>

            {modalError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {modalError}
              </div>
            )}

            <div className="space-y-2">
              {(['low', 'medium', 'high', 'critical'] as IntegritySeverity[]).map((sev) => {
                const sMeta = INTEGRITY_SEVERITIES[sev];
                const isSelected = targetSeverity === sev;
                return (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setTargetSeverity(sev)}
                    className={cn(
                      'w-full p-3 rounded-2xl border text-left flex items-center justify-between text-xs font-bold transition-all',
                      isSelected
                        ? 'bg-blue-50 border-blue-500 text-blue-950 ring-1 ring-blue-500'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    )}
                  >
                    <span>{sMeta.label}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                disabled={modalLoading}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleChangeSeverity}
                disabled={modalLoading}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 flex items-center justify-center gap-1.5"
              >
                {modalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
                <span>Simpan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Resolve / Status */}
      {(activeModal === 'resolve' || activeModal === 'status') && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-black text-slate-900">
              {activeModal === 'resolve' ? 'Selesaikan Investigasi Integritas' : 'Perbarui Status Kasus'}
            </h3>

            {modalError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {modalError}
              </div>
            )}

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  Status Akhir
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as IntegrityStatus)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
                >
                  <option value="triage">Screening / Triage</option>
                  <option value="investigating">Proses Investigasi</option>
                  <option value="action_required">Perlu Tindakan Lanjutan</option>
                  <option value="resolved">Selesai / Terbukti & Ditindak</option>
                  <option value="unsubstantiated">Tidak Terbukti / Bukti Tidak Memadai</option>
                  <option value="duplicate">Duplikat</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  Tindakan yang Diambil (Action Taken)
                </label>
                <input
                  type="text"
                  value={resolutionAction}
                  onChange={(e) => setResolutionAction(e.target.value)}
                  placeholder="Contoh: Surat Peringatan (SP) & pengetatan kontrol akses"
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  Catatan Kesimpulan / Hasil Investigasi (Dapat dibaca pelapor)
                </label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Ringkasan temuan dan konfirmasi penanganan..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                disabled={modalLoading}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange(targetStatus)}
                disabled={modalLoading}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 flex items-center justify-center gap-1.5"
              >
                {modalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Simpan Status</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Photo Lightbox */}
      {selectedPhotoUrl && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSelectedPhotoUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setSelectedPhotoUrl(null)}
              className="absolute -top-10 right-0 p-2 rounded-full bg-slate-800 text-white hover:bg-rose-600"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedPhotoUrl}
              alt="Bukti Foto"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
