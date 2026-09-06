'use client';

import { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ClipboardCheck,
  ArrowLeft,
  CheckCircle2,
  AlertOctagon,
  MinusCircle,
  Camera,
  X,
  Loader2,
  AlertCircle,
  FileEdit,
  MapPin,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Save,
  Check,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import {
  InspectionStatusBadge,
  OverallResultBadge,
  type InspectionStatus,
  type OverallResult,
} from './InspectionStatusBadge';
import {
  submitInspectionResultAction,
  completeInspectionAction,
  addInspectionEvidenceAction,
} from '@/app/actions/inspections';
import { CancelInspectionModal } from './CancelInspectionModal';
import {
  BUCKETS,
  buildInspectionEvidencePath,
  compressAndUpload,
  deleteFile,
} from '@/lib/supabase/storage';

export interface ChecklistItem {
  id: string;
  section_id: string;
  label: string;
  description?: string | null;
  is_required: boolean;
  sort_order: number;
}

export interface ChecklistSection {
  id: string;
  template_id: string;
  title: string;
  sort_order: number;
  items: ChecklistItem[];
}

export interface InspectionEvidence {
  id?: string;
  inspection_id: string;
  inspection_result_id?: string | null;
  file_url: string;
  file_name?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  caption?: string | null;
  uploaded_at?: string;
}

export interface ChecklistResult {
  id?: string;
  inspection_id: string;
  item_id: string;
  value: 'ok' | 'ng' | 'na';
  notes?: string | null;
}

export interface InspectionData {
  id: string;
  inspection_number: string;
  warehouse_id: string;
  asset_id: string;
  template_id: string;
  status: InspectionStatus;
  overall_result: OverallResult;
  notes?: string | null;
  cancellation_reason?: string | null;
  started_at: string;
  completed_at?: string | null;
  created_at: string;
  inspector?: {
    id: string;
    full_name: string;
  } | null;
  asset?: {
    id: string;
    asset_code: string;
    name: string;
    category?: { name: string } | null;
    area?: { name: string } | null;
    location?: { name: string } | null;
  } | null;
  template?: {
    id: string;
    name: string;
    category?: { name: string } | null;
  } | null;
  warehouse?: {
    id: string;
    code: string;
    name: string;
  } | null;
  sections: ChecklistSection[];
  initialResults: ChecklistResult[];
  initialEvidences: InspectionEvidence[];
}

interface InspectionChecklistViewProps {
  inspection: InspectionData;
}

export function InspectionChecklistView({ inspection }: InspectionChecklistViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Results state keyed by item_id
  const [results, setResults] = useState<Record<string, { resultId?: string; value: 'ok' | 'ng' | 'na'; notes: string }>>(() => {
    const map: Record<string, { resultId?: string; value: 'ok' | 'ng' | 'na'; notes: string }> = {};
    for (const r of inspection.initialResults) {
      map[r.item_id] = {
        resultId: r.id,
        value: r.value,
        notes: r.notes || '',
      };
    }
    return map;
  });

  // Evidences state keyed by item_id
  const [evidences, setEvidences] = useState<Record<string, InspectionEvidence[]>>(() => {
    const map: Record<string, InspectionEvidence[]> = {};
    for (const ev of inspection.initialEvidences) {
      // Find item_id matching inspection_result_id
      const res = inspection.initialResults.find((r) => r.id === ev.inspection_result_id);
      const key = res?.item_id || 'general';
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    }
    return map;
  });

  const [savingItemIds, setSavingItemIds] = useState<Record<string, boolean>>({});
  const [activeNotesItemIds, setActiveNotesItemIds] = useState<Record<string, boolean>>({});
  const [uploadingItemIds, setUploadingItemIds] = useState<Record<string, boolean>>({});
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);

  // Flatten all items
  const allItems = useMemo(() => {
    const list: ChecklistItem[] = [];
    for (const sec of inspection.sections) {
      for (const item of sec.items) {
        list.push(item);
      }
    }
    return list;
  }, [inspection.sections]);

  // Total required items & filled count
  const stats = useMemo(() => {
    const total = allItems.length;
    const requiredItems = allItems.filter((i) => i.is_required);
    const filledCount = allItems.filter((i) => results[i.id]?.value != null).length;
    const requiredFilledCount = requiredItems.filter((i) => results[i.id]?.value != null).length;
    const requiredRemaining = requiredItems.length - requiredFilledCount;
    const ngCount = allItems.filter((i) => results[i.id]?.value === 'ng').length;
    const progressPercent = total > 0 ? Math.round((filledCount / total) * 100) : 0;

    return {
      total,
      filledCount,
      requiredCount: requiredItems.length,
      requiredFilledCount,
      requiredRemaining,
      ngCount,
      progressPercent,
      isAllRequiredFilled: requiredRemaining === 0,
    };
  }, [allItems, results]);

  // Handle value change for an item
  const handleValueChange = async (itemId: string, value: 'ok' | 'ng' | 'na') => {
    const current = results[itemId] || { value: 'ok', notes: '' };
    const updated = { ...current, value };

    setResults((prev) => ({ ...prev, [itemId]: updated }));
    setSavingItemIds((prev) => ({ ...prev, [itemId]: true }));
    setCompletionError(null);

    // If NG selected, auto-open notes field so inspector can write defect observation
    if (value === 'ng') {
      setActiveNotesItemIds((prev) => ({ ...prev, [itemId]: true }));
    }

    try {
      const res = await submitInspectionResultAction({
        inspectionId: inspection.id,
        itemId,
        value,
        notes: updated.notes,
      });

      if (res.success && res.resultId) {
        setResults((prev) => ({
          ...prev,
          [itemId]: { ...prev[itemId], resultId: res.resultId },
        }));
      }
    } catch (err) {
      console.error('Failed to autosave item result:', err);
    } finally {
      setSavingItemIds((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  // Handle notes change for an item
  const handleNotesChange = async (itemId: string, notes: string) => {
    const current = results[itemId];
    if (!current) return;

    const updated = { ...current, notes };
    setResults((prev) => ({ ...prev, [itemId]: updated }));
  };

  const handleNotesBlur = async (itemId: string) => {
    const current = results[itemId];
    if (!current) return;

    setSavingItemIds((prev) => ({ ...prev, [itemId]: true }));
    try {
      const res = await submitInspectionResultAction({
        inspectionId: inspection.id,
        itemId,
        value: current.value,
        notes: current.notes,
      });

      if (res.success && res.resultId) {
        setResults((prev) => ({
          ...prev,
          [itemId]: { ...prev[itemId], resultId: res.resultId },
        }));
      }
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setSavingItemIds((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  // Handle photo upload for an item
  const handleFileUpload = async (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploadingItemIds((prev) => ({ ...prev, [itemId]: true }));

    let storagePath: string | null = null;
    try {
      // 1. Ensure result row exists in database first
      let activeResultId = results[itemId]?.resultId;
      if (!activeResultId) {
        const saveRes = await submitInspectionResultAction({
          inspectionId: inspection.id,
          itemId,
          value: results[itemId]?.value || 'ok',
          notes: results[itemId]?.notes || '',
        });
        if (saveRes.success && saveRes.resultId) {
          activeResultId = saveRes.resultId;
          setResults((prev) => ({
            ...prev,
            [itemId]: { ...(prev[itemId] || { value: 'ok', notes: '' }), resultId: saveRes.resultId },
          }));
        } else {
          throw new Error(saveRes.error || 'Gagal menyiapkan record checklist sebelum upload.');
        }
      }

      // 2. Compress and upload to Storage
      storagePath = buildInspectionEvidencePath(inspection.warehouse_id, inspection.id, 'jpg');
      await compressAndUpload(BUCKETS.INSPECTION_EVIDENCES, storagePath, file);

      // 3. Persist evidence metadata via addInspectionEvidenceAction
      const evRes = await addInspectionEvidenceAction({
        inspectionId: inspection.id,
        inspectionResultId: activeResultId,
        fileUrl: storagePath,
        fileName: file.name,
        fileSize: file.size,
        mimeType: 'image/jpeg',
      });

      if (evRes.success && evRes.evidenceId) {
        // Only append to state on confirmed database persistence!
        setEvidences((prev) => ({
          ...prev,
          [itemId]: [
            ...(prev[itemId] || []),
            {
              id: evRes.evidenceId,
              inspection_id: inspection.id,
              inspection_result_id: activeResultId,
              file_url: storagePath!,
              file_name: file.name,
            },
          ],
        }));
      } else {
        // Definitive validation failure vs network/transport unknown outcome
        const isNetworkOrUnknown =
          evRes.error?.toLowerCase().includes('network') ||
          evRes.error?.toLowerCase().includes('fetch') ||
          evRes.error?.toLowerCase().includes('timeout') ||
          evRes.error?.toLowerCase().includes('connection');

        if (!isNetworkOrUnknown && storagePath) {
          // Definitive rejection (e.g. invalid MIME, wrong warehouse, already closed): clean up orphan object
          await deleteFile(BUCKETS.INSPECTION_EVIDENCES, storagePath).catch(() => {});
        }
        alert(evRes.error || 'Gagal menyimpan metadata bukti foto ke database.');
      }
    } catch (err: unknown) {
      // For network/unknown exceptions: do NOT delete file so it can be retried idempotently
      alert(err instanceof Error ? err.message : 'Gagal mengunggah foto.');
    } finally {
      setUploadingItemIds((prev) => ({ ...prev, [itemId]: false }));
      if (e.target) e.target.value = '';
    }
  };

  // Handle Complete Inspection
  const isAnyUploading = Object.values(uploadingItemIds).some(Boolean);

  const handleCompleteInspection = async () => {
    if (isAnyUploading) {
      setCompletionError(
        'Mohon tunggu hingga proses unggah dan penyimpanan foto selesai sebelum menyelesaikan inspeksi.'
      );
      return;
    }

    if (!stats.isAllRequiredFilled) {
      setCompletionError(
        `Masih terdapat ${stats.requiredRemaining} poin checklist wajib (*) yang belum diisi.`
      );
      return;
    }

    setIsCompleting(true);
    setCompletionError(null);

    try {
      const res = await completeInspectionAction(inspection.id);
      if (res.success) {
        startTransition(() => {
          router.refresh();
        });
      } else {
        setCompletionError(res.error || 'Gagal menyelesaikan inspeksi.');
        setIsCompleting(false);
      }
    } catch (err: unknown) {
      setCompletionError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem.');
      setIsCompleting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-36 sm:pb-24">
      {/* ── 1. Top Navigation & Action ──────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Link
          href="/inspections"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl neu-btn-secondary text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar</span>
        </Link>

        <button
          type="button"
          onClick={() => setIsCancelModalOpen(true)}
          className="px-3 py-1.5 rounded-xl neu-btn-secondary text-rose-600 dark:text-rose-400 font-bold text-xs transition-colors"
        >
          Batalkan Sesi
        </button>
      </div>

      {/* ── 2. Main Inspection Header Card ──────────────────────────────── */}
      <div className="bg-[#EEF2F7] dark:bg-[#131C31] rounded-2xl sm:rounded-3xl border border-black/[0.04] dark:border-white/[0.05] neu-raised p-4 sm:p-6 space-y-4 relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-black text-blue-700 dark:text-blue-300 neu-inset-sm bg-blue-500/10 px-2.5 py-0.5 rounded-lg border border-blue-500/20">
                {inspection.inspection_number}
              </span>
              <InspectionStatusBadge status="draft" size="md" />
            </div>

            <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
              {inspection.template?.name || 'Checklist Inspeksi QC'}
            </h1>
          </div>

          <Link
            href={`/assets/${inspection.asset_id}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl neu-btn-secondary text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors self-start sm:self-center shrink-0"
          >
            <span>Aset: {inspection.asset?.asset_code}</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </Link>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-black/[0.04] dark:border-white/[0.05] text-xs">
          <div className="p-2.5 rounded-xl neu-inset-sm bg-[#E5EBF3] dark:bg-[#0D1322] border border-black/[0.03] dark:border-white/[0.03]">
            <span className="block text-[10px] font-extrabold uppercase text-slate-400">
              Nama Aset
            </span>
            <span className="font-black text-slate-900 dark:text-white mt-0.5 block truncate">
              {inspection.asset?.name || '-'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl neu-inset-sm bg-[#E5EBF3] dark:bg-[#0D1322] border border-black/[0.03] dark:border-white/[0.03]">
            <span className="block text-[10px] font-extrabold uppercase text-slate-400">
              Lokasi / Area
            </span>
            <span className="font-bold text-slate-700 dark:text-slate-300 mt-0.5 block truncate">
              {inspection.warehouse?.code} &bull; {inspection.asset?.area?.name || 'Area Umum'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl neu-inset-sm bg-[#E5EBF3] dark:bg-[#0D1322] border border-black/[0.03] dark:border-white/[0.03]">
            <span className="block text-[10px] font-extrabold uppercase text-slate-400">
              Inspector
            </span>
            <span className="font-bold text-slate-700 dark:text-slate-300 mt-0.5 block truncate">
              {inspection.inspector?.full_name || 'Petugas QC'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl neu-inset-sm bg-[#E5EBF3] dark:bg-[#0D1322] border border-black/[0.03] dark:border-white/[0.03]">
            <span className="block text-[10px] font-extrabold uppercase text-slate-400">
              Mulai Sesi
            </span>
            <span className="font-bold text-slate-700 dark:text-slate-300 mt-0.5 block truncate">
              {new Date(inspection.started_at).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              WIB
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. Progress & Defect Summary ────────────────────────────────── */}
      <div className="bg-[#EEF2F7] dark:bg-[#131C31] rounded-2xl sm:rounded-3xl border border-black/[0.04] dark:border-white/[0.05] neu-raised p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-900 dark:text-white">
              Progress Checklist:
            </span>
            <span className="font-black text-blue-700 dark:text-blue-300 neu-inset-sm bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
              {stats.filledCount} dari {stats.total} Poin ({stats.progressPercent}%)
            </span>
          </div>

          {stats.ngCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-rose-700 dark:text-rose-300 bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 rounded-lg">
              <AlertOctagon className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 animate-pulse" />
              <span>{stats.ngCount} Temuan Defect</span>
            </span>
          )}
        </div>

        {/* Clean Gradient Progress Bar */}
        <div className="w-full h-2.5 rounded-full neu-inset-sm bg-[#E5EBF3] dark:bg-[#0D1322] overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              stats.progressPercent === 100
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-xs'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-xs'
            }`}
            style={{ width: `${stats.progressPercent}%` }}
          />
        </div>

        {stats.requiredRemaining > 0 && (
          <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            <span>Masih ada {stats.requiredRemaining} poin wajib (*) yang belum ditentukan kondisinya.</span>
          </p>
        )}
      </div>

      {completionError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-start gap-2.5 shadow-2xs animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">{completionError}</div>
        </div>
      )}

      {/* ── 4. Sections & Items Checklist ───────────────────────────────── */}
      <div className="space-y-4 sm:space-y-5">
        {inspection.sections.map((section, sIndex) => (
          <div
            key={section.id}
            className="bg-[#EEF2F7] dark:bg-[#131C31] rounded-2xl sm:rounded-3xl border border-black/[0.04] dark:border-white/[0.05] neu-raised overflow-hidden"
          >
            {/* Section Header */}
            <div className="bg-[#E5EBF3] dark:bg-[#0D1322] px-4 sm:px-5 py-3 border-b border-black/[0.04] dark:border-white/[0.05] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg neu-inset-sm bg-blue-500/10 text-blue-700 dark:text-blue-300 font-mono font-black text-[11px] flex items-center justify-center">
                  {sIndex + 1}
                </span>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  {section.title}
                </h3>
              </div>

              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 neu-inset-sm bg-[#EEF2F7] dark:bg-[#131C31] px-2 py-0.5 rounded-md border border-black/[0.04] dark:border-white/[0.05]">
                {section.items.filter((i) => results[i.id]?.value != null).length} / {section.items.length} Selesai
              </span>
            </div>

            {/* Section Items */}
            <div className="divide-y divide-black/[0.03] dark:divide-white/[0.03]">
              {section.items.map((item, iIndex) => {
                const currentResult = results[item.id];
                const currentValue = currentResult?.value;
                const isSaving = savingItemIds[item.id];
                const isNotesOpen = activeNotesItemIds[item.id] || (currentResult?.notes && currentResult.notes.length > 0);
                const isUploading = uploadingItemIds[item.id];

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 sm:p-4 transition-colors space-y-2.5 ${
                      currentValue === 'ng'
                        ? 'bg-rose-500/5 dark:bg-rose-950/20'
                        : currentValue === 'ok'
                        ? 'bg-emerald-500/5 dark:bg-emerald-950/20'
                        : ''
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      {/* Item Label & Description */}
                      <div className="space-y-0.5 flex-1 pr-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                            {item.label}
                          </span>
                          {item.is_required && (
                            <span className="text-rose-500 font-black text-xs" title="Item Wajib">
                              *
                            </span>
                          )}
                          {isSaving && (
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1 animate-pulse">
                              <Save className="w-2.5 h-2.5" />
                              <span>Menyimpan...</span>
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* 3-Way Pill Toggles: OK, NG, N/A */}
                      <div className="flex items-center gap-1.5 shrink-0 neu-inset-sm bg-[#E5EBF3] dark:bg-[#0D1322] p-1 rounded-2xl self-start sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleValueChange(item.id, 'ok')}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                            currentValue === 'ok'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>OK</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleValueChange(item.id, 'ng')}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                            currentValue === 'ng'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
                          }`}
                        >
                          <AlertOctagon className="w-3.5 h-3.5" />
                          <span>NG</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleValueChange(item.id, 'na')}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                            currentValue === 'na'
                              ? 'bg-slate-700 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <MinusCircle className="w-3.5 h-3.5" />
                          <span>N/A</span>
                        </button>
                      </div>
                    </div>

                    {/* Notes & Photo Attachments Bar */}
                    <div className="flex items-center justify-between gap-2 text-xs pt-1 border-t border-black/[0.04] dark:border-white/[0.05]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveNotesItemIds((prev) => ({
                              ...prev,
                              [item.id]: !prev[item.id],
                            }))
                          }
                          className={`inline-flex items-center gap-1 text-[11px] font-bold transition-colors ${
                            currentResult?.notes
                              ? 'text-blue-700 dark:text-blue-400 font-extrabold'
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                        >
                          <FileEdit className="w-3 h-3" />
                          <span>
                            {currentResult?.notes ? 'Ubah Catatan Temuan' : '+ Catatan Tambahan'}
                          </span>
                        </button>

                        <label className={`inline-flex items-center gap-1 text-[11px] font-bold cursor-pointer transition-colors px-2 py-0.5 rounded-md ${
                          currentValue === 'ng' && (!evidences[item.id] || evidences[item.id].length === 0)
                            ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 font-extrabold'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}>
                          <Camera className="w-3 h-3" />
                          <span>
                            {isUploading ? 'Mengunggah...' : '+ Foto Bukti'}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => handleFileUpload(item.id, e)}
                            className="hidden"
                            disabled={isUploading}
                          />
                        </label>
                      </div>

                      {/* Evidence thumb count */}
                      {evidences[item.id] && evidences[item.id].length > 0 && (
                        <span className="text-[10.5px] font-bold text-slate-600 dark:text-slate-400 neu-inset-sm px-2 py-0.5 rounded-md">
                          {evidences[item.id].length} Foto
                        </span>
                      )}
                    </div>

                    {/* Notes Textarea (if active) */}
                    {isNotesOpen && (
                      <div className="pt-1.5 animate-in fade-in duration-100">
                        <textarea
                          rows={2}
                          value={currentResult?.notes || ''}
                          onChange={(e) => handleNotesChange(item.id, e.target.value)}
                          onBlur={() => handleNotesBlur(item.id)}
                          placeholder={
                            currentValue === 'ng'
                              ? 'Jelaskan temuan kerusakan / defect yang ditemukan...'
                              : 'Tuliskan catatan kondisi item (opsional)...'
                          }
                          className={`w-full text-xs rounded-xl neu-inset p-2.5 font-medium focus:outline-hidden ${
                            currentValue === 'ng'
                              ? 'border-rose-300 dark:border-rose-700 focus:ring-2 focus:ring-rose-500/20'
                              : 'border-black/[0.04] dark:border-white/[0.05]'
                          }`}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── 5. Fixed Bottom Action Bar ──────────────────────────────────── */}
      <div className="fixed bottom-[calc(100px+env(safe-area-inset-bottom,0px))] sm:bottom-0 left-0 right-0 z-50 px-3 sm:px-6 py-2 sm:py-3 pointer-events-none sm:pointer-events-auto sm:bg-[#EEF2F7]/95 sm:dark:bg-[#131C31]/95 sm:backdrop-blur-md sm:border-t sm:border-black/[0.04] sm:dark:border-white/[0.05] sm:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="max-w-4xl mx-auto pointer-events-auto">
          <div className="bg-[#EEF2F7]/95 dark:bg-[#131C31]/95 backdrop-blur-md border border-black/[0.04] dark:border-white/[0.05] sm:border-0 rounded-2xl sm:rounded-none p-3 sm:p-0 neu-raised-lg sm:shadow-none flex items-center justify-between gap-3">
          <div className="text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-bold block sm:inline">
              Progress: {stats.filledCount}/{stats.total} Selesai &bull;{' '}
            </span>
            {stats.ngCount > 0 ? (
              <span className="font-extrabold text-rose-600 dark:text-rose-400">
                {stats.ngCount} Poin Defect (NG)
              </span>
            ) : (
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                Semua OK sejauh ini
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCompleteInspection}
              disabled={isCompleting || isPending || isAnyUploading}
              className={`inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 rounded-xl font-bold text-xs transition-all disabled:opacity-50 ${
                stats.isAllRequiredFilled
                  ? 'fintech-btn-primary'
                  : 'neu-btn-secondary text-slate-700 dark:text-slate-200'
              }`}
            >
              {isCompleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi Hasil...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Selesaikan Inspeksi</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>

      {/* Cancel Modal */}
      {isCancelModalOpen && (
        <CancelInspectionModal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          inspectionId={inspection.id}
          inspectionNumber={inspection.inspection_number}
          onSuccess={() => {
            router.push('/inspections');
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
