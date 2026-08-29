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
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar</span>
        </Link>

        <button
          type="button"
          onClick={() => setIsCancelModalOpen(true)}
          className="px-3 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-xs transition-colors active:scale-95"
        >
          Batalkan Sesi
        </button>
      </div>

      {/* ── 2. Main Inspection Header Card ──────────────────────────────── */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs p-4 sm:p-6 space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50/50 via-indigo-50/20 to-transparent rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-black text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200/70 shadow-2xs">
                {inspection.inspection_number}
              </span>
              <InspectionStatusBadge status="draft" size="md" />
            </div>

            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-snug">
              {inspection.template?.name || 'Checklist Inspeksi QC'}
            </h1>
          </div>

          <Link
            href={`/assets/${inspection.asset_id}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 transition-colors self-start sm:self-center shrink-0 active:scale-95"
          >
            <span>Aset: {inspection.asset?.asset_code}</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </Link>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-slate-100 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70">
            <span className="block text-[10px] font-extrabold uppercase text-slate-400">
              Nama Aset
            </span>
            <span className="font-black text-slate-900 mt-0.5 block truncate">
              {inspection.asset?.name || '-'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70">
            <span className="block text-[10px] font-extrabold uppercase text-slate-400">
              Lokasi / Area
            </span>
            <span className="font-bold text-slate-700 mt-0.5 block truncate">
              {inspection.warehouse?.code} &bull; {inspection.asset?.area?.name || 'Area Umum'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70">
            <span className="block text-[10px] font-extrabold uppercase text-slate-400">
              Inspector
            </span>
            <span className="font-bold text-slate-700 mt-0.5 block truncate">
              {inspection.inspector?.full_name || 'Petugas QC'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70">
            <span className="block text-[10px] font-extrabold uppercase text-slate-400">
              Mulai Sesi
            </span>
            <span className="font-bold text-slate-700 mt-0.5 block truncate">
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
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-900">
              Progress Checklist:
            </span>
            <span className="font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
              {stats.filledCount} dari {stats.total} Poin ({stats.progressPercent}%)
            </span>
          </div>

          {stats.ngCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-lg shadow-2xs">
              <AlertOctagon className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
              <span>{stats.ngCount} Temuan Defect</span>
            </span>
          )}
        </div>

        {/* Clean Gradient Progress Bar */}
        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              stats.progressPercent === 100
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600'
            }`}
            style={{ width: `${stats.progressPercent}%` }}
          />
        </div>

        {stats.requiredRemaining > 0 && (
          <p className="text-[11px] text-amber-700 font-semibold flex items-center gap-1.5">
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
            className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden"
          >
            {/* Section Header */}
            <div className="bg-slate-50/90 px-4 sm:px-5 py-3 border-b border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-mono font-black text-[11px] flex items-center justify-center">
                  {sIndex + 1}
                </span>
                <h3 className="text-xs sm:text-sm font-black text-slate-900">
                  {section.title}
                </h3>
              </div>

              <span className="text-[11px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                {section.items.filter((i) => results[i.id]?.value != null).length} / {section.items.length} Selesai
              </span>
            </div>

            {/* Section Items */}
            <div className="divide-y divide-slate-100">
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
                        ? 'bg-rose-50/20'
                        : currentValue === 'ok'
                        ? 'bg-emerald-50/10'
                        : ''
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      {/* Item Label & Description */}
                      <div className="space-y-0.5 flex-1 pr-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-black text-slate-900">
                            {item.label}
                          </span>
                          {item.is_required && (
                            <span className="text-rose-500 font-black text-xs" title="Item Wajib">
                              *
                            </span>
                          )}
                          {isSaving && (
                            <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1 animate-pulse">
                              <Save className="w-2.5 h-2.5" />
                              <span>Menyimpan...</span>
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* 3-Way Pill Toggles: OK, NG, N/A */}
                      <div className="flex items-center gap-1.5 shrink-0 bg-slate-100/90 p-1 rounded-xl self-start sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleValueChange(item.id, 'ok')}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black transition-all active:scale-95 ${
                            currentValue === 'ok'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-600 hover:bg-white hover:text-slate-900'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>OK</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleValueChange(item.id, 'ng')}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black transition-all active:scale-95 ${
                            currentValue === 'ng'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'text-slate-600 hover:bg-white hover:text-rose-700'
                          }`}
                        >
                          <AlertOctagon className="w-3.5 h-3.5" />
                          <span>NG</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleValueChange(item.id, 'na')}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black transition-all active:scale-95 ${
                            currentValue === 'na'
                              ? 'bg-slate-700 text-white shadow-xs'
                              : 'text-slate-600 hover:bg-white hover:text-slate-900'
                          }`}
                        >
                          <MinusCircle className="w-3.5 h-3.5" />
                          <span>N/A</span>
                        </button>
                      </div>
                    </div>

                    {/* Notes & Photo Attachments Bar */}
                    <div className="flex items-center justify-between gap-2 text-xs pt-1 border-t border-slate-100/60">
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
                              ? 'text-blue-700 font-extrabold'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <FileEdit className="w-3 h-3" />
                          <span>
                            {currentResult?.notes ? 'Ubah Catatan Temuan' : '+ Catatan Tambahan'}
                          </span>
                        </button>

                        <label className={`inline-flex items-center gap-1 text-[11px] font-bold cursor-pointer transition-colors px-2 py-0.5 rounded-md ${
                          currentValue === 'ng' && (!evidences[item.id] || evidences[item.id].length === 0)
                            ? 'bg-rose-50 text-rose-700 border border-rose-200/80 font-extrabold'
                            : 'text-slate-500 hover:text-slate-800'
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
                        <span className="text-[10.5px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
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
                          className={`w-full text-xs rounded-xl border p-2.5 font-medium focus:outline-none focus:ring-2 ${
                            currentValue === 'ng'
                              ? 'border-rose-300 bg-white focus:border-rose-500 focus:ring-rose-500/20'
                              : 'border-slate-200 bg-slate-50 focus:border-blue-500 focus:ring-blue-500/20'
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
      <div className="fixed bottom-[calc(100px+env(safe-area-inset-bottom,0px))] sm:bottom-0 left-0 right-0 z-50 px-3 sm:px-6 py-2 sm:py-3 pointer-events-none sm:pointer-events-auto sm:bg-white/95 sm:backdrop-blur-md sm:border-t sm:border-slate-200/80 sm:shadow-lg sm:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="max-w-4xl mx-auto pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 sm:border-0 rounded-2xl sm:rounded-none p-3 sm:p-0 shadow-lg shadow-slate-900/10 sm:shadow-none flex items-center justify-between gap-3">
          <div className="text-xs">
            <span className="text-slate-500 font-bold block sm:inline">
              Progress: {stats.filledCount}/{stats.total} Selesai &bull;{' '}
            </span>
            {stats.ngCount > 0 ? (
              <span className="font-extrabold text-rose-600">
                {stats.ngCount} Poin Defect (NG)
              </span>
            ) : (
              <span className="font-bold text-emerald-600">
                Semua OK sejauh ini
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCompleteInspection}
              disabled={isCompleting || isPending || isAnyUploading}
              className={`inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 rounded-xl font-bold text-xs shadow-xs transition-all active:scale-95 disabled:opacity-50 ${
                stats.isAllRequiredFilled
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-500/20'
                  : 'bg-slate-800 hover:bg-slate-900 text-white'
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
