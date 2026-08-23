'use client';
// components/cases/CaseWorkflowActionPanel.tsx
// Comprehensive Workflow Action Panel for Case Lifecycle Transitions
// Assign PIC -> Update Progress -> Add After Evidence -> Request Verification -> Verify/Reject -> Reopen

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  BUCKETS,
  buildCaseEvidencePath,
  compressImage,
  uploadFile,
} from '@/lib/supabase/storage';
import {
  UserPlus,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCw,
  Camera,
  Image as ImageIcon,
  MessageSquare,
  Wrench,
  AlertTriangle,
  Loader2,
  AlertCircle,
  FileText,
  UserCheck,
  Send,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface AssignableUser {
  id: string;
  full_name: string;
  avatar_url?: string | null;
}

export interface RootCauseItem {
  id: string;
  name: string;
}

interface CaseWorkflowActionPanelProps {
  caseId: string;
  caseNumber: string;
  warehouseId: string;
  status: string;
  priority: string;
  hasOperationalImpact: boolean;
  requiresMaintenance: boolean;
  currentUserId: string;
  currentAssigneeId?: string | null;
  currentAssigneeName?: string | null;
  reporterId: string;
  assignableUsers: AssignableUser[];
  rootCauses: RootCauseItem[];
}

export function CaseWorkflowActionPanel({
  caseId,
  caseNumber,
  warehouseId,
  status,
  priority,
  hasOperationalImpact,
  requiresMaintenance,
  currentUserId,
  currentAssigneeId,
  currentAssigneeName,
  reporterId,
  assignableUsers,
  rootCauses,
}: CaseWorkflowActionPanelProps) {
  const router = useRouter();

  const [activeModal, setActiveModal] = useState<
    'assign' | 'progress' | 'evidence' | 'verify' | 'reject' | 'reopen' | 'comment' | null
  >(null);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [selectedAssigneeId, setSelectedAssigneeId] = useState(currentAssigneeId || '');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [preventiveAction, setPreventiveAction] = useState('');
  const [selectedRootCauseId, setSelectedRootCauseId] = useState('');
  const [verificationNote, setVerificationNote] = useState('');
  const [rejectionNote, setRejectionNote] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [commentContent, setCommentContent] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);

  // Evidence upload state
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const [evidenceCaption, setEvidenceCaption] = useState('');
  const [evidencePhase, setEvidencePhase] = useState<'during' | 'after'>('after');
  const [evidenceProcessing, setEvidenceProcessing] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const isAssignee = currentAssigneeId === currentUserId;
  const isReporter = reporterId === currentUserId;

  const resetFormState = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    if (evidencePreview) URL.revokeObjectURL(evidencePreview);
    setEvidenceFile(null);
    setEvidencePreview(null);
    setEvidenceCaption('');
  };

  const closeModal = () => {
    if (loading) return;
    setActiveModal(null);
    resetFormState();
  };

  // ── 1. Assign PIC Handler ───────────────────────────────────────────────
  const handleAssignPIC = async () => {
    if (!selectedAssigneeId) {
      setErrorMessage('Pilih salah satu staf untuk ditugaskan.');
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any;
      const { error } = await supabase.rpc('assign_case', {
        p_case_id: caseId,
        p_assignee_id: selectedAssigneeId,
      });

      if (error) throw new Error(error.message);

      setSuccessMessage('PIC berhasil ditugaskan!');
      setTimeout(() => {
        closeModal();
        router.refresh();
      }, 500);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal menugaskan PIC');
      setLoading(false);
    }
  };

  // ── 2. Update Progress Handler ──────────────────────────────────────────
  const handleUpdateProgress = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any;
      const { error } = await supabase.rpc('update_case_progress', {
        p_case_id: caseId,
        p_corrective_action: correctiveAction.trim() || null,
        p_preventive_action: preventiveAction.trim() || null,
        p_root_cause_id: selectedRootCauseId || null,
        p_has_operational_impact: hasOperationalImpact,
        p_requires_maintenance: requiresMaintenance,
      });

      if (error) throw new Error(error.message);

      setSuccessMessage('Progres kasus berhasil diperbarui!');
      setTimeout(() => {
        closeModal();
        router.refresh();
      }, 500);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal memperbarui progres');
      setLoading(false);
    }
  };

  // ── 3. Upload Evidence Photo Handler ────────────────────────────────────
  const handleSelectEvidenceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setEvidenceProcessing(true);
    try {
      const { blob } = await compressImage(file, 1920, 0.82);
      setEvidenceFile(new File([blob], file.name, { type: 'image/jpeg' }));
      setEvidencePreview(URL.createObjectURL(blob));
    } catch {
      setEvidenceFile(file);
      setEvidencePreview(URL.createObjectURL(file));
    } finally {
      setEvidenceProcessing(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleUploadEvidence = async () => {
    if (!evidenceFile) {
      setErrorMessage('Pilih atau ambil foto bukti terlebih dahulu.');
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any;
      const storagePath = buildCaseEvidencePath(warehouseId, caseId, 'jpg');

      await uploadFile(
        BUCKETS.CASE_EVIDENCES,
        storagePath,
        evidenceFile,
        'image/jpeg'
      );

      const { error: rpcErr } = await supabase.rpc('add_case_evidence', {
        p_case_id: caseId,
        p_phase: evidencePhase,
        p_file_url: storagePath,
        p_file_name: evidenceFile.name,
        p_file_size: evidenceFile.size,
        p_mime_type: 'image/jpeg',
        p_caption: evidenceCaption.trim() || `Bukti ${evidencePhase}`,
      });

      if (rpcErr) throw new Error(rpcErr.message);

      setSuccessMessage('Foto bukti berhasil diunggah!');
      setTimeout(() => {
        closeModal();
        router.refresh();
      }, 500);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal mengunggah bukti');
      setLoading(false);
    }
  };

  // ── 4. Request Verification Handler ─────────────────────────────────────
  const handleRequestVerification = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any;
      const { error } = await supabase.rpc('request_case_verification', {
        p_case_id: caseId,
      });

      if (error) throw new Error(error.message);

      setSuccessMessage('Verifikasi berhasil diajukan ke tim QC/Koordinator!');
      setTimeout(() => {
        router.refresh();
      }, 600);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal mengajukan verifikasi');
      setLoading(false);
    }
  };

  // ── 5. QC Verify (Approve) Handler ──────────────────────────────────────
  const handleVerifyApprove = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any;
      const { error } = await supabase.rpc('verify_case', {
        p_case_id: caseId,
        p_approved: true,
        p_note: verificationNote.trim() || 'Pekerjaan telah diverifikasi dan disetujui.',
      });

      if (error) throw new Error(error.message);

      setSuccessMessage('Kasus berhasil diverifikasi & ditutup (Closed)!');
      setTimeout(() => {
        closeModal();
        router.refresh();
      }, 600);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal menyetujui verifikasi');
      setLoading(false);
    }
  };

  // ── 6. QC Reject (Rework) Handler ───────────────────────────────────────
  const handleVerifyReject = async () => {
    if (!rejectionNote.trim()) {
      setErrorMessage('Alasan penolakan / catatan perbaikan wajib diisi.');
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any;
      const { error } = await supabase.rpc('verify_case', {
        p_case_id: caseId,
        p_approved: false,
        p_note: rejectionNote.trim(),
      });

      if (error) throw new Error(error.message);

      setSuccessMessage('Kasus dikembalikan ke status On Progress untuk perbaikan!');
      setTimeout(() => {
        closeModal();
        router.refresh();
      }, 600);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal menolak verifikasi');
      setLoading(false);
    }
  };

  // ── 7. Reopen Case Handler ──────────────────────────────────────────────
  const handleReopen = async () => {
    if (!reopenReason.trim()) {
      setErrorMessage('Alasan membuka kembali kasus wajib diisi.');
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any;
      const { error } = await supabase.rpc('reopen_case', {
        p_case_id: caseId,
        p_reason: reopenReason.trim(),
      });

      if (error) throw new Error(error.message);

      setSuccessMessage('Kasus berhasil dibuka kembali (Reopened)!');
      setTimeout(() => {
        closeModal();
        router.refresh();
      }, 600);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal membuka kembali kasus');
      setLoading(false);
    }
  };

  // ── 8. Add Comment Handler ──────────────────────────────────────────────
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim()) return;
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any;
      const { error } = await supabase.rpc('add_case_comment', {
        p_case_id: caseId,
        p_content: commentContent.trim(),
        p_is_internal: isInternalComment,
      });

      if (error) throw new Error(error.message);

      setCommentContent('');
      router.refresh();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal menambahkan komentar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Bar Card */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
              Aksi & Alur Kerja Kasus
            </h2>
          </div>
          <span className="text-[11px] font-bold text-slate-500 capitalize">
            Status: <span className="text-slate-900">{status.replace(/_/g, ' ')}</span>
          </span>
        </div>

        {/* Dynamic Action Buttons based on Status */}
        <div className="flex flex-wrap gap-2 pt-1">
          {/* Action 1: Assign PIC (if open, reopened, or on_progress) */}
          {status !== 'closed' && (
            <button
              type="button"
              onClick={() => setActiveModal('assign')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200/80 active:scale-95 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>{currentAssigneeName ? 'Ganti PIC' : 'Tugaskan PIC'}</span>
            </button>
          )}

          {/* Action 2: Update Progress (if on_progress / waiting_repair) */}
          {(status === 'on_progress' || status === 'waiting_repair') && (
            <>
              <button
                type="button"
                onClick={() => setActiveModal('progress')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 active:scale-95 transition-all"
              >
                <FileText className="w-4 h-4 text-slate-600" />
                <span>Update Progres & Koreksi</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEvidencePhase('after');
                  setActiveModal('evidence');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200/80 active:scale-95 transition-all"
              >
                <Camera className="w-4 h-4" />
                <span>Unggah Bukti Selesai (After)</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={handleRequestVerification}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-xs active:scale-95 disabled:opacity-50 transition-all"
              >
                <Clock className="w-4 h-4" />
                <span>Ajukan Verifikasi QC</span>
              </button>
            </>
          )}

          {/* Action 3: QC Verification (if waiting_verification) */}
          {status === 'waiting_verification' && (
            <>
              <button
                type="button"
                onClick={() => setActiveModal('verify')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs active:scale-95 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Setujui & Selesaikan (Close)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveModal('reject')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 active:scale-95 transition-all"
              >
                <XCircle className="w-4 h-4" />
                <span>Tolak / Minta Perbaikan</span>
              </button>
            </>
          )}

          {/* Action 4: Reopen Case (if closed) */}
          {status === 'closed' && (
            <button
              type="button"
              onClick={() => setActiveModal('reopen')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs border border-amber-200 active:scale-95 transition-all"
            >
              <RotateCw className="w-4 h-4 text-amber-700" />
              <span>Buka Kembali Kasus (Reopen)</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Add Comment Form ─────────────────────────────────────────────── */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-600" />
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
            Komentar & Catatan Kasus
          </h3>
        </div>

        <form onSubmit={handleAddComment} className="space-y-2">
          <div className="relative">
            <textarea
              rows={2}
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              placeholder="Tulis catatan, instruksi teknis, atau pembaruan investigasi..."
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={isInternalComment}
                onChange={(e) => setIsInternalComment(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Catatan Internal (QC & Tim Operasional)</span>
            </label>

            <button
              type="submit"
              disabled={loading || !commentContent.trim()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs active:scale-95 disabled:opacity-50 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kirim</span>
            </button>
          </div>
        </form>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL 1: ASSIGN PIC                                                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeModal === 'assign' && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-extrabold text-slate-900">Tugaskan PIC Kasus</h3>
              </div>
              <button onClick={closeModal} className="p-1 rounded-full text-slate-400 hover:text-slate-700">
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Pilih Staf / Teknisi PIC
              </label>
              <div className="max-h-60 overflow-y-auto space-y-1.5 no-scrollbar py-1">
                {assignableUsers.map((u) => {
                  const isSelected = selectedAssigneeId === u.id;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setSelectedAssigneeId(u.id)}
                      className={cn(
                        'w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all',
                        isSelected
                          ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500 font-bold text-blue-900'
                          : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-slate-800 text-white font-bold text-xs flex items-center justify-center">
                          {u.full_name[0].toUpperCase()}
                        </div>
                        <span className="text-xs">{u.full_name}</span>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleAssignPIC}
                disabled={loading || !selectedAssigneeId}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                <span>Simpan Penugasan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL 2: UPDATE PROGRESS & KOREKSI                                  */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeModal === 'progress' && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl p-5 shadow-2xl space-y-3.5 max-h-[90vh] overflow-y-auto no-scrollbar animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-extrabold text-slate-900">Update Progres & Akar Masalah</h3>
              </div>
              <button onClick={closeModal} className="p-1 rounded-full text-slate-400 hover:text-slate-700">
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Root Cause Selection */}
            <div className="space-y-1">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Akar Masalah (Root Cause)
              </label>
              <select
                value={selectedRootCauseId}
                onChange={(e) => setSelectedRootCauseId(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">-- Pilih Akar Masalah --</option>
                {rootCauses.map((rc) => (
                  <option key={rc.id} value={rc.id}>{rc.name}</option>
                ))}
              </select>
            </div>

            {/* Corrective Action */}
            <div className="space-y-1">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Tindakan Korektif (Corrective Action)
              </label>
              <textarea
                rows={2}
                value={correctiveAction}
                onChange={(e) => setCorrectiveAction(e.target.value)}
                placeholder="Tindakan langsung yang telah dilakukan untuk mengatasi masalah..."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Preventive Action */}
            <div className="space-y-1">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Tindakan Pencegahan (Preventive Action)
              </label>
              <textarea
                rows={2}
                value={preventiveAction}
                onChange={(e) => setPreventiveAction(e.target.value)}
                placeholder="Langkah pencegahan agar masalah serupa tidak terulang kembali..."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleUpdateProgress}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL 3: UPLOAD AFTER / DURING EVIDENCE                             */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeModal === 'evidence' && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl space-y-3.5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-extrabold text-slate-900">Unggah Bukti Hasil Perbaikan</h3>
              </div>
              <button onClick={closeModal} className="p-1 rounded-full text-slate-400 hover:text-slate-700">
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={photoInputRef}
              onChange={handleSelectEvidenceFile}
              className="hidden"
            />

            {/* Photo Picker / Preview */}
            {evidencePreview ? (
              <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 group">
                <img src={evidencePreview} alt="Preview" className="w-full h-full object-contain" />
                <button
                  type="button"
                  onClick={() => {
                    setEvidenceFile(null);
                    setEvidencePreview(null);
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={evidenceProcessing}
                onClick={() => photoInputRef.current?.click()}
                className="w-full py-8 rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/40 flex flex-col items-center justify-center gap-2 text-slate-600 hover:text-emerald-700 transition-all"
              >
                {evidenceProcessing ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                    <span className="text-xs font-bold">Memproses foto...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-7 h-7 text-slate-400" />
                    <span className="text-xs font-extrabold">Ambil / Pilih Foto Hasil Selesai (After)</span>
                  </>
                )}
              </button>
            )}

            <div className="space-y-1">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Keterangan Foto (Caption)
              </label>
              <input
                type="text"
                value={evidenceCaption}
                onChange={(e) => setEvidenceCaption(e.target.value)}
                placeholder="Contoh: Penggantian bearing dan kabel sensor selesai diuji"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleUploadEvidence}
                disabled={loading || !evidenceFile || evidenceProcessing}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                <span>Unggah Bukti</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL 4: QC APPROVE & CLOSE                                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeModal === 'verify' && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl space-y-3.5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-extrabold text-slate-900">Verifikasi & Tutup Kasus</h3>
              </div>
              <button onClick={closeModal} className="p-1 rounded-full text-slate-400 hover:text-slate-700">
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <p className="text-xs text-slate-600">
              Apakah Anda yakin pekerjaan perbaikan pada kasus <strong>{caseNumber}</strong> telah sesuai standar QC operasional gudang?
            </p>

            <div className="space-y-1">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Catatan Verifikasi (Opsional)
              </label>
              <textarea
                rows={2}
                value={verificationNote}
                onChange={(e) => setVerificationNote(e.target.value)}
                placeholder="Contoh: Telah diuji running test selama 30 menit, kondisi normal..."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleVerifyApprove}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Setujui & Selesaikan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL 5: QC REJECT (REWORK)                                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeModal === 'reject' && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl space-y-3.5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-600" />
                <h3 className="text-sm font-extrabold text-slate-900">Tolak Verifikasi (Minta Perbaikan)</h3>
              </div>
              <button onClick={closeModal} className="p-1 rounded-full text-slate-400 hover:text-slate-700">
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Alasan Penolakan / Catatan Perbaikan <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                placeholder="Jelaskan bagian yang belum tuntas atau perlu diperbaiki ulang oleh PIC..."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                autoFocus
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleVerifyReject}
                disabled={loading || !rejectionNote.trim()}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-xs hover:bg-rose-700 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                <span>Kembalikan ke PIC</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL 6: REOPEN CASE                                                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeModal === 'reopen' && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl space-y-3.5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <RotateCw className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-extrabold text-slate-900">Buka Kembali Kasus (Reopen)</h3>
              </div>
              <button onClick={closeModal} className="p-1 rounded-full text-slate-400 hover:text-slate-700">
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Alasan Membuka Kembali <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="Jelaskan alasan mengapa kasus ini perlu dibuka dan diinvestigasi kembali..."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                autoFocus
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleReopen}
                disabled={loading || !reopenReason.trim()}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white font-bold text-xs shadow-xs hover:bg-amber-700 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
                <span>Buka Kembali</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
