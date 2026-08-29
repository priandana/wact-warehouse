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
  deleteFile,
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
  Tag,
  Calendar,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Select } from '@/components/shared/Select';
import { MobileCaseActionBar } from './MobileCaseActionBar';

export interface AssignableUser {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  role_name?: string;
  role_display_name?: string;
}

export interface RootCauseItem {
  id: string;
  name: string;
}

interface CaseWorkflowActionPanelProps {
  caseId: string;
  caseNumber: string;
  warehouseId: string;
  warehouseName?: string;
  status: string;
  priority: string;
  dueDate?: string | null;
  hasOperationalImpact: boolean;
  requiresMaintenance: boolean;
  currentUserId: string;
  currentAssigneeId?: string | null;
  currentAssigneeName?: string | null;
  reporterId: string;
  userRole?: string;
  userCapabilities?: string[];
  isSuperAdmin?: boolean;
  assignableUsers: AssignableUser[];
  rootCauses: RootCauseItem[];
  hasAfterEvidence?: boolean;
}

export function CaseWorkflowActionPanel({
  caseId,
  caseNumber,
  warehouseId,
  warehouseName,
  status,
  priority,
  dueDate,
  hasOperationalImpact,
  requiresMaintenance,
  currentUserId,
  currentAssigneeId,
  currentAssigneeName,
  reporterId,
  userRole,
  userCapabilities,
  isSuperAdmin = false,
  assignableUsers,
  rootCauses,
  hasAfterEvidence = true,
}: CaseWorkflowActionPanelProps) {
  const router = useRouter();

  const isAssignee = currentAssigneeId === currentUserId;
  const isReporter = reporterId === currentUserId;

  const caps = new Set<string>(userCapabilities ?? []);

  // Strict capability-driven authorization (preserves multi-role capability union)
  // An empty capability set grants no operational permissions. Unrelated capabilities are never substituted.
  const canAssign = caps.has('case.assign');
  const canUpdateProgress = caps.has('case.update_progress') && (isAssignee || caps.has('case.view_all'));
  const canUploadEvidence = caps.has('evidence.upload') && (isAssignee || isReporter || caps.has('case.view_all'));
  const canRequestVerification = caps.has('case.request_verification') && (isAssignee || caps.has('case.view_all'));
  const canVerify = caps.has('case.verify') && !isAssignee;
  const canReopen = caps.has('case.reopen');
  const canChangePriority = caps.has('case.change_priority');
  const canOverrideDueDate = caps.has('case.override_due_date');
  const canForceClose = caps.has('case.force_close');

  const [activeModal, setActiveModal] = useState<
    'assign' | 'progress' | 'evidence' | 'verify' | 'reject' | 'reopen' | 'comment' | 'priority' | 'due_date' | 'force_close' | null
  >(null);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [selectedAssigneeId, setSelectedAssigneeId] = useState(currentAssigneeId || '');
  const [selectedPriority, setSelectedPriority] = useState(priority || 'medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [dueDateReason, setDueDateReason] = useState('');
  const [forceCloseReason, setForceCloseReason] = useState('');
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
  const [uploadStep, setUploadStep] = useState<'idle' | 'uploading' | 'saving' | 'done'>('idle');
  const photoInputRef = useRef<HTMLInputElement>(null);

  const resetFormState = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setUploadStep('idle');
    if (evidencePreview) URL.revokeObjectURL(evidencePreview);
    setEvidenceFile(null);
    setEvidencePreview(null);
    setEvidenceCaption('');
  };

  const resetAndCloseModal = () => {
    setActiveModal(null);
    resetFormState();
  };

  // User-requested modal close (cancel / X button / backdrop) - guarded while operation is active
  const closeModal = () => {
    if (loading) return;
    resetAndCloseModal();
  };

  // Unguarded internal action completion - cleanly resets modal state and loading
  const completeModalAction = () => {
    setLoading(false);
    resetAndCloseModal();
  };

  // ── 1. Assign PIC Handler ───────────────────────────────────────────────
  const handleAssignPIC = async () => {
    if (loading) return;
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

      if (error) {
        if (
          error.message.includes('not an active PIC') ||
          error.message.includes('not an active member')
        ) {
          throw new Error('Pengguna yang dipilih bukan PIC / Maintenance aktif di gudang kasus.');
        }
        if (error.message.includes('missing case.assign')) {
          throw new Error('Anda tidak memiliki hak akses untuk menugaskan PIC pada kasus ini.');
        }
        throw new Error(error.message);
      }

      setSuccessMessage('PIC berhasil ditugaskan!');
      setTimeout(() => {
        completeModalAction();
        router.refresh();
      }, 500);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal menugaskan PIC');
      setLoading(false);
    }
  };

  // ── 2. Update Progress Handler ──────────────────────────────────────────
  const handleUpdateProgress = async () => {
    if (loading) return;
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
        completeModalAction();
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
    if (loading) return;
    if (!evidenceFile) {
      setErrorMessage('Pilih atau ambil foto bukti terlebih dahulu.');
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    setUploadStep('uploading');

    let uploadedStoragePath: string | null = null;

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
      uploadedStoragePath = storagePath;

      setUploadStep('saving');

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

      setUploadStep('done');
      setSuccessMessage('Foto bukti berhasil diunggah!');
      setTimeout(() => {
        completeModalAction();
        router.refresh();
      }, 500);
    } catch (err: unknown) {
      // Clean up orphaned storage object if Storage upload succeeded but DB RPC failed
      if (uploadedStoragePath) {
        try {
          await deleteFile(BUCKETS.CASE_EVIDENCES, uploadedStoragePath);
        } catch (delErr) {
          console.error('Diagnostic: Failed to remove orphaned storage object:', delErr);
        }
      }
      setErrorMessage(err instanceof Error ? err.message : 'Gagal mengunggah bukti');
      setUploadStep('idle');
      setLoading(false);
    }
  };

  // ── 4. Request Verification Handler ─────────────────────────────────────
  const handleRequestVerification = async () => {
    if (loading) return;
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
        setLoading(false);
        router.refresh();
      }, 600);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal mengajukan verifikasi');
      setLoading(false);
    }
  };

  // ── 5. QC Verify (Approve) Handler ──────────────────────────────────────
  const handleVerifyApprove = async () => {
    if (loading) return;
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
        completeModalAction();
        router.refresh();
      }, 600);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal menyetujui verifikasi');
      setLoading(false);
    }
  };

  // ── 6. QC Reject (Rework) Handler ───────────────────────────────────────
  const handleVerifyReject = async () => {
    if (loading) return;
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
        completeModalAction();
        router.refresh();
      }, 600);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal menolak verifikasi');
      setLoading(false);
    }
  };

  // ── 7. Reopen Case Handler ──────────────────────────────────────────────
  const handleReopen = async () => {
    if (loading) return;
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
        completeModalAction();
        router.refresh();
      }, 600);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal membuka kembali kasus');
      setLoading(false);
    }
  };

  // ── 8. Change Priority Handler ───────────────────────────────────────────
  const handleChangePriority = async () => {
    if (loading) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any;
      const { error } = await supabase.rpc('change_case_priority', {
        p_case_id: caseId,
        p_priority: selectedPriority,
      });

      if (error) throw new Error(error.message);

      setSuccessMessage('Prioritas kasus berhasil diubah!');
      setTimeout(() => {
        completeModalAction();
        router.refresh();
      }, 500);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal mengubah prioritas');
      setLoading(false);
    }
  };

  // ── 9. Override Due Date Handler ─────────────────────────────────────────
  const handleOverrideDueDate = async () => {
    if (loading) return;
    if (!newDueDate) {
      setErrorMessage('Batas waktu baru wajib dipilih.');
      return;
    }
    if (!dueDateReason.trim()) {
      setErrorMessage('Alasan perubahan batas waktu wajib diisi.');
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any;
      const { error } = await supabase.rpc('override_case_due_date', {
        p_case_id: caseId,
        p_new_due_date: new Date(newDueDate).toISOString(),
        p_reason: dueDateReason.trim(),
      });

      if (error) throw new Error(error.message);

      setSuccessMessage('Batas waktu (Due Date) berhasil diperbarui!');
      setTimeout(() => {
        completeModalAction();
        router.refresh();
      }, 500);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal mengubah batas waktu');
      setLoading(false);
    }
  };

  // ── 10. Force Close Handler (Admin Only) ─────────────────────────────────
  const handleForceClose = async () => {
    if (loading) return;
    if (!forceCloseReason.trim()) {
      setErrorMessage('Alasan penutupan paksa wajib diisi.');
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any;
      const { error } = await supabase.rpc('force_close_case', {
        p_case_id: caseId,
        p_reason: forceCloseReason.trim(),
      });

      if (error) throw new Error(error.message);

      setSuccessMessage('Kasus berhasil ditutup paksa oleh Admin!');
      setTimeout(() => {
        completeModalAction();
        router.refresh();
      }, 600);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal menutup paksa kasus');
      setLoading(false);
    }
  };

  // ── 11. Add Comment Handler ─────────────────────────────────────────────
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
      {/* ── Main Action Bar ─────────────────────────────────────────────── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
              Aksi Operasional
            </h2>
          </div>
          <span className="text-[10.5px] font-bold text-slate-500 capitalize bg-slate-100 px-2 py-0.5 rounded-md">
            {status.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Error / Success Alerts on Main Panel */}
        {errorMessage && !activeModal && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}
        {successMessage && !activeModal && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-snug">{successMessage}</span>
          </div>
        )}

        {/* 1. Primary Operational Actions based on Status */}
        <div className="space-y-2">
          {/* Action 1: Assign PIC (only for Admin / Coordinator when open / reopened) */}
          {(status === 'open' || status === 'reopened') && canAssign && (
            <button
              type="button"
              onClick={() => setActiveModal('assign')}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs shadow-xs active:scale-[0.98] transition-all"
            >
              <UserPlus className="w-4 h-4 stroke-[2.5]" />
              <span>{currentAssigneeName ? 'Ganti Penugasan PIC' : 'Tugaskan PIC Sekarang'}</span>
            </button>
          )}

          {/* Action: QC Verification (if waiting_verification) */}
          {status === 'waiting_verification' && (
            <>
              {canVerify ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal('verify')}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs active:scale-[0.98] transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    <span>Setujui & Selesaikan (Close)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveModal('reject')}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 active:scale-[0.98] transition-all"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Tolak / Minta Perbaikan Ulang</span>
                  </button>
                </div>
              ) : isAssignee ? (
                <div className="p-3 rounded-xl bg-indigo-50/80 border border-indigo-100 text-[11.5px] font-semibold text-indigo-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Menunggu verifikasi dari tim QC / Koordinator. PIC tidak dapat memverifikasi pekerjaan sendiri.</span>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11.5px] font-semibold text-slate-600 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Menunggu verifikasi dari tim QC / Koordinator.</span>
                </div>
              )}
            </>
          )}

          {/* Action 2: Update Progress (if on_progress / waiting_repair) */}
          {(status === 'on_progress' || status === 'waiting_repair') && (
            <div className="space-y-2">
              {canRequestVerification && !hasAfterEvidence && (
                <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[11.5px] text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Foto Selesai Diperlukan</p>
                    <p className="text-amber-800 font-normal mt-0.5">
                      Lengkapi foto bukti penyelesaian (Foto Selesai) sebelum mengajukan verifikasi QC.
                    </p>
                  </div>
                </div>
              )}

              {canRequestVerification && (
                <button
                  type="button"
                  disabled={loading || !hasAfterEvidence}
                  onClick={handleRequestVerification}
                  title={!hasAfterEvidence ? 'Lengkapi foto selesai sebelum mengajukan verifikasi' : undefined}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs shadow-xs active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <Clock className="w-4 h-4 stroke-[2.5]" />
                  <span>Ajukan Verifikasi QC</span>
                </button>
              )}

              <div className="grid grid-cols-2 gap-2">
                {canUploadEvidence && (
                  <button
                    type="button"
                    onClick={() => {
                      setEvidencePhase('after');
                      setActiveModal('evidence');
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200/80 active:scale-95 transition-all text-center"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Foto Selesai</span>
                  </button>
                )}

                {canUpdateProgress && (
                  <button
                    type="button"
                    onClick={() => setActiveModal('progress')}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 active:scale-95 transition-all text-center"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-600" />
                    <span>Update Progres</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Action 4: Reopen Case (if closed, only for Admin / Coordinator) */}
          {status === 'closed' && canReopen && (
            <button
              type="button"
              onClick={() => setActiveModal('reopen')}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs border border-amber-200 active:scale-[0.98] transition-all"
            >
              <RotateCw className="w-4 h-4 text-amber-700" />
              <span>Buka Kembali Kasus (Reopen)</span>
            </button>
          )}
        </div>

        {/* 2. Administrative Controls */}
        {(canChangePriority || canOverrideDueDate || canForceClose) && status !== 'closed' && (
          <div className="pt-2 border-t border-slate-100">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
              Kontrol Administratif
            </p>
            <div className="flex flex-wrap gap-1.5">
              {canChangePriority && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPriority(priority);
                    setActiveModal('priority');
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-[11px] border border-slate-200/70 active:scale-95 transition-all"
                >
                  <Tag className="w-3 h-3 text-slate-500" />
                  <span>Prioritas</span>
                </button>
              )}

              {canOverrideDueDate && (
                <button
                  type="button"
                  onClick={() => {
                    setNewDueDate(dueDate ? new Date(dueDate).toISOString().slice(0, 16) : '');
                    setActiveModal('due_date');
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-[11px] border border-slate-200/70 active:scale-95 transition-all"
                >
                  <Calendar className="w-3 h-3 text-slate-500" />
                  <span>Batas SLA</span>
                </button>
              )}

              {canForceClose && (
                <button
                  type="button"
                  onClick={() => setActiveModal('force_close')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-[11px] border border-rose-200 active:scale-95 transition-all"
                >
                  <ShieldAlert className="w-3 h-3 text-rose-600" />
                  <span>Tutup Paksa</span>
                </button>
              )}
            </div>
          </div>
        )}
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
        <div className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[85vh] overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0 bg-white">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-extrabold text-slate-900">Tugaskan PIC Kasus</h3>
              </div>
              <button onClick={closeModal} className="p-1 rounded-full text-slate-400 hover:text-slate-700">
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto overscroll-contain flex-1 space-y-4 touch-pan-y">

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
              {assignableUsers.length === 0 ? (
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-center space-y-1.5 my-1">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mx-auto" />
                  <p className="text-xs font-bold text-amber-900">
                    Belum ada PIC / Maintenance aktif di {warehouseName || 'warehouse ini'}.
                  </p>
                  <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                    Tambahkan role PIC / Maintenance pada pengguna aktif terlebih dahulu.
                  </p>
                </div>
              ) : (
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
                          <div className="w-7 h-7 rounded-lg bg-slate-800 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {u.full_name[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs truncate">{u.full_name}</p>
                            {u.role_display_name && (
                              <p className="text-[10px] text-slate-500 font-semibold truncate">{u.role_display_name}</p>
                            )}
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            </div>

            {/* Sticky Actions Footer */}
            <div
              className="flex items-center gap-2 px-5 py-3.5 border-t border-slate-100 bg-slate-50/90 shrink-0 rounded-b-3xl"
              style={{ paddingBottom: 'max(0.875rem, env(safe-area-inset-bottom, 0px))' }}
            >
              <button
                type="button"
                onClick={closeModal}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleAssignPIC}
                disabled={loading || !selectedAssigneeId || assignableUsers.length === 0}
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
        <div className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[85vh] overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0 bg-white">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-extrabold text-slate-900">Update Progres & Akar Masalah</h3>
              </div>
              <button onClick={closeModal} className="p-1 rounded-full text-slate-400 hover:text-slate-700">
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto overscroll-contain flex-1 space-y-4 touch-pan-y">
              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Root Cause Selection */}
              <Select
                label="Akar Masalah (Root Cause)"
                value={selectedRootCauseId}
                onChange={setSelectedRootCauseId}
                placeholder="-- Pilih Akar Masalah --"
                searchable={true}
                searchPlaceholder="Cari akar masalah..."
                options={rootCauses.map((rc) => ({ value: rc.id, label: rc.name }))}
              />

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
            </div>

            {/* Sticky Actions Footer */}
            <div
              className="flex items-center gap-2 px-5 py-3.5 border-t border-slate-100 bg-slate-50/90 shrink-0 rounded-b-3xl"
              style={{ paddingBottom: 'max(0.875rem, env(safe-area-inset-bottom, 0px))' }}
            >
              <button
                type="button"
                onClick={closeModal}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors"
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
        <div className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[85vh] overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0 bg-white">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-extrabold text-slate-900">Unggah Bukti Hasil Perbaikan</h3>
              </div>
              <button onClick={closeModal} className="p-1 rounded-full text-slate-400 hover:text-slate-700">
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto overscroll-contain flex-1 space-y-4 touch-pan-y">
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
                      <span className="text-xs font-bold text-emerald-700">Menyiapkan foto...</span>
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
            </div>

            {/* Sticky Actions Footer */}
            <div
              className="flex items-center gap-2 px-5 py-3.5 border-t border-slate-100 bg-slate-50/90 shrink-0 rounded-b-3xl"
              style={{ paddingBottom: 'max(0.875rem, env(safe-area-inset-bottom, 0px))' }}
            >
              <button
                type="button"
                onClick={closeModal}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors"
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
                <span>
                  {uploadStep === 'uploading'
                    ? 'Mengunggah foto...'
                    : uploadStep === 'saving'
                    ? 'Menyimpan bukti...'
                    : uploadStep === 'done'
                    ? 'Foto berhasil diunggah'
                    : 'Unggah Bukti'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL 4: QC APPROVE & CLOSE                                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeModal === 'verify' && (
        <div className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[85vh] overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0 bg-white">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-extrabold text-slate-900">Verifikasi & Tutup Kasus</h3>
              </div>
              <button onClick={closeModal} className="p-1 rounded-full text-slate-400 hover:text-slate-700">
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto overscroll-contain flex-1 space-y-4 touch-pan-y">
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
            </div>

            {/* Sticky Actions Footer */}
            <div
              className="flex items-center gap-2 px-5 py-3.5 border-t border-slate-100 bg-slate-50/90 shrink-0 rounded-b-3xl"
              style={{ paddingBottom: 'max(0.875rem, env(safe-area-inset-bottom, 0px))' }}
            >
              <button
                type="button"
                onClick={closeModal}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors"
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
        <div className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[85vh] overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0 bg-white">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-600" />
                <h3 className="text-sm font-extrabold text-slate-900">Tolak Verifikasi (Minta Perbaikan)</h3>
              </div>
              <button onClick={closeModal} className="p-1 rounded-full text-slate-400 hover:text-slate-700">
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto overscroll-contain flex-1 space-y-4 touch-pan-y">
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
            </div>

            {/* Sticky Actions Footer */}
            <div
              className="flex items-center gap-2 px-5 py-3.5 border-t border-slate-100 bg-slate-50/90 shrink-0 rounded-b-3xl"
              style={{ paddingBottom: 'max(0.875rem, env(safe-area-inset-bottom, 0px))' }}
            >
              <button
                type="button"
                onClick={closeModal}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors"
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
        <div className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[85vh] overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0 bg-white">
              <div className="flex items-center gap-2">
                <RotateCw className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-extrabold text-slate-900">Buka Kembali Kasus (Reopen)</h3>
              </div>
              <button onClick={closeModal} className="p-1 rounded-full text-slate-400 hover:text-slate-700">
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto overscroll-contain flex-1 space-y-4 touch-pan-y">
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
            </div>

            {/* Sticky Actions Footer */}
            <div
              className="flex items-center gap-2 px-5 py-3.5 border-t border-slate-100 bg-slate-50/90 shrink-0 rounded-b-3xl"
              style={{ paddingBottom: 'max(0.875rem, env(safe-area-inset-bottom, 0px))' }}
            >
              <button
                type="button"
                onClick={closeModal}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors"
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

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL 7: CHANGE PRIORITY                                            */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeModal === 'priority' && (
        <div className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[85vh] overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0 bg-white">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-extrabold text-slate-900">Ubah Prioritas Kasus</h3>
              </div>
              <button onClick={closeModal} className="p-1 rounded-full text-slate-400 hover:text-slate-700">
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto overscroll-contain flex-1 space-y-4 touch-pan-y">
              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <Select
                label="Tingkat Prioritas Kasus"
                value={selectedPriority}
                onChange={setSelectedPriority}
                options={[
                  { value: 'low', label: 'Rendah (Low) — SLA 72 Jam' },
                  { value: 'medium', label: 'Sedang (Medium) — SLA 24 Jam' },
                  { value: 'high', label: 'Tinggi (High) — SLA 8 Jam' },
                  { value: 'critical', label: 'Kritis (Critical) — SLA 2 Jam' },
                ]}
              />
            </div>

            {/* Sticky Actions Footer */}
            <div
              className="flex items-center gap-2 px-5 py-3.5 border-t border-slate-100 bg-slate-50/90 shrink-0 rounded-b-3xl"
              style={{ paddingBottom: 'max(0.875rem, env(safe-area-inset-bottom, 0px))' }}
            >
              <button
                type="button"
                onClick={closeModal}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleChangePriority}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
                <span>Simpan Prioritas</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL 8: OVERRIDE DUE DATE                                          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeModal === 'due_date' && (
        <div className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[85vh] overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0 bg-white">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-extrabold text-slate-900">Ubah Batas Waktu SLA Kasus</h3>
              </div>
              <button onClick={closeModal} className="p-1 rounded-full text-slate-400 hover:text-slate-700">
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto overscroll-contain flex-1 space-y-4 touch-pan-y">
              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  Batas Waktu Baru (Due Date) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  Alasan Perubahan Batas Waktu <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={dueDateReason}
                  onChange={(e) => setDueDateReason(e.target.value)}
                  placeholder="Jelaskan alasan perubahan SLA (misal: kendala pengiriman sparepart)..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  autoFocus
                />
              </div>
            </div>

            {/* Sticky Actions Footer */}
            <div
              className="flex items-center gap-2 px-5 py-3.5 border-t border-slate-100 bg-slate-50/90 shrink-0 rounded-b-3xl"
              style={{ paddingBottom: 'max(0.875rem, env(safe-area-inset-bottom, 0px))' }}
            >
              <button
                type="button"
                onClick={closeModal}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleOverrideDueDate}
                disabled={loading || !newDueDate || !dueDateReason.trim()}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs shadow-xs hover:bg-purple-700 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                <span>Perbarui Batas Waktu</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL 9: FORCE CLOSE (ADMIN ONLY)                                    */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeModal === 'force_close' && (
        <div className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[85vh] overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0 bg-white">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <h3 className="text-sm font-extrabold text-slate-900">Tutup Paksa Kasus (Admin Only)</h3>
              </div>
              <button onClick={closeModal} className="p-1 rounded-full text-slate-400 hover:text-slate-700">
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto overscroll-contain flex-1 space-y-4 touch-pan-y">
              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-100 text-xs text-rose-800 leading-relaxed font-medium">
                ⚠️ <strong>Perhatian:</strong> Tindakan ini akan langsung menyelesaikan kasus <strong>{caseNumber}</strong> tanpa melalui verifikasi QC standar. Wajib menyertakan alasan resmi.
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  Alasan Penutupan Paksa <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={forceCloseReason}
                  onChange={(e) => setForceCloseReason(e.target.value)}
                  placeholder="Contoh: Laporan duplikat atau diselesaikan melalui jalur maintenance pusat..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  autoFocus
                />
              </div>
            </div>

            {/* Sticky Actions Footer */}
            <div
              className="flex items-center gap-2 px-5 py-3.5 border-t border-slate-100 bg-slate-50/90 shrink-0 rounded-b-3xl"
              style={{ paddingBottom: 'max(0.875rem, env(safe-area-inset-bottom, 0px))' }}
            >
              <button
                type="button"
                onClick={closeModal}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleForceClose}
                disabled={loading || !forceCloseReason.trim()}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-xs hover:bg-rose-700 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                <span>Tutup Paksa Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile Sticky Action Bar ─────────────────────────────────────── */}
      {/* Rendered here — inside CaseWorkflowActionPanel — so it shares the   */}
      {/* same resolved booleans and handlers without any duplication.         */}
      {/* Desktop: sm:hidden. All capability flags & handlers come from above. */}
      <MobileCaseActionBar
        status={status}
        canAssign={canAssign}
        canRequestVerification={canRequestVerification}
        canVerify={canVerify}
        canReopen={canReopen}
        hasAfterEvidence={hasAfterEvidence}
        loading={loading}
        onAssign={() => setActiveModal('assign')}
        onRequestVerification={handleRequestVerification}
        onVerify={() => setActiveModal('verify')}
        onReopen={() => setActiveModal('reopen')}
      />

      {/* ── Mobile Spacer ────────────────────────────────────────────────── */}
      {/* When the sticky bar is visible, push the last content card clear of */}
      {/* the bar so it remains fully reachable. Invisible on desktop.         */}
      {(
        ((status === 'open' || status === 'reopened') && canAssign) ||
        ((status === 'on_progress' || status === 'waiting_repair') && canRequestVerification) ||
        (status === 'waiting_verification' && canVerify) ||
        (status === 'closed' && canReopen)
      ) && (
        <div className="sm:hidden h-16" aria-hidden="true" />
      )}
    </div>
  );
}
