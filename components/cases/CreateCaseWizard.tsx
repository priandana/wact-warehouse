'use client';
// components/cases/CreateCaseWizard.tsx
// Fast, Consumer/Fintech 4-Step Mobile-First Case Creation Wizard
// Includes instant compression UX, progress state, and retryable upload flow.

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useActiveWarehouse } from '@/components/shared/layout/AppShellProvider';
import {
  BUCKETS,
  buildCaseEvidencePath,
  compressImage,
  uploadFile,
} from '@/lib/supabase/storage';
import { PriorityBadge, type Priority } from '@/components/shared/PriorityBadge';
import { Select } from '@/components/shared/Select';
import Link from 'next/link';
import { type ServerInspectionContext } from '@/app/(app)/cases/new/page';
import { CameraCaptureModal } from '@/components/shared/CameraCaptureModal';
import {
  ChevronLeft,
  ChevronRight,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  X,
  Loader2,
  AlertCircle,
  Building2,
  Package,
  Wrench,
  AlertTriangle,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  RotateCw,
  ExternalLink,
  Maximize2,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface CategoryItem {
  id: string;
  name: string;
  icon?: string | null;
}

export interface SubcategoryItem {
  id: string;
  category_id: string;
  name: string;
}

export interface AreaItem {
  id: string;
  warehouse_id: string;
  code: string;
  name: string;
}

export interface LocationItem {
  id: string;
  area_id: string;
  warehouse_id: string;
  code: string;
  name: string;
}

export interface AssetItem {
  id: string;
  warehouse_id: string;
  area_id?: string | null;
  asset_code: string;
  name: string;
}

interface CreateCaseWizardProps {
  categories: CategoryItem[];
  subcategories: SubcategoryItem[];
  areas: AreaItem[];
  locations: LocationItem[];
  assets: AssetItem[];
  inspectionContext?: ServerInspectionContext | null;
  initialAssetId?: string;
  initialAreaId?: string;
  initialLocationId?: string;
  initialWarehouseId?: string;
  initialInspectionId?: string;
  initialInspectionNumber?: string;
  initialTitle?: string;
  initialDescription?: string;
  initialSource?: string;
  initialPriority?: string;
}

export interface PhotoItem {
  id: string;
  rawFile: File;
  previewUrl: string;
  compressedBlob?: Blob;
  compressedSize?: number;
  status: 'processing' | 'ready' | 'error';
  errorMessage?: string;
}

const DRAFT_STORAGE_KEY = 'wact_case_draft_v1';

export function CreateCaseWizard({
  categories,
  subcategories,
  areas,
  locations,
  assets,
  inspectionContext,
  initialAssetId,
  initialAreaId,
  initialLocationId,
  initialWarehouseId,
  initialInspectionId,
  initialInspectionNumber,
  initialTitle,
  initialDescription,
  initialSource,
  initialPriority,
}: CreateCaseWizardProps) {
  const router = useRouter();
  const { activeWarehouse } = useActiveWarehouse();
  const activeWarehouseId =
    inspectionContext?.warehouseId || initialWarehouseId || activeWarehouse?.warehouseId;

  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitStatusText, setSubmitStatusText] = useState<string>('Mengirim laporan...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Partial success state (Case created, evidence upload failed)
  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null);
  const [partialEvidenceError, setPartialEvidenceError] = useState<string | null>(null);

  // Idempotency key (UUID v4 generated once per draft)
  const [clientRequestId, setClientRequestId] = useState<string>('');

  // Form State
  const [title, setTitle] = useState<string>(
    inspectionContext?.defaultTitle || initialTitle || ''
  );
  const [categoryId, setCategoryId] = useState<string>('');
  const [subcategoryId, setSubcategoryId] = useState<string>('');
  const [priority, setPriority] = useState<Priority>(
    initialPriority && ['low', 'medium', 'high', 'critical'].includes(initialPriority)
      ? (initialPriority as Priority)
      : 'medium'
  );

  const [areaId, setAreaId] = useState<string>(() => {
    if (inspectionContext?.areaId) return inspectionContext.areaId;
    if (initialAreaId) return initialAreaId;
    const targetAssetId = inspectionContext?.assetId || initialAssetId;
    if (targetAssetId) {
      const match = assets.find((a) => a.id === targetAssetId);
      return match?.area_id || '';
    }
    return '';
  });
  const [locationId, setLocationId] = useState<string>(
    inspectionContext?.locationId || initialLocationId || ''
  );
  const [assetId, setAssetId] = useState<string>(
    inspectionContext?.assetId || initialAssetId || ''
  );

  const [description, setDescription] = useState<string>(
    inspectionContext?.defaultDescription || initialDescription || ''
  );
  const [hasOperationalImpact, setHasOperationalImpact] = useState<boolean>(
    Boolean(inspectionContext || initialAssetId || initialInspectionId)
  );
  const [requiresMaintenance, setRequiresMaintenance] = useState<boolean>(
    Boolean(inspectionContext || initialAssetId || initialInspectionId)
  );

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState<boolean>(false);
  const [viewingSourceEvidenceIdx, setViewingSourceEvidenceIdx] = useState<number | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Initialize draft and clientRequestId
  useEffect(() => {
    try {
      if (initialAssetId || initialInspectionId) {
        if (initialAssetId) setAssetId(initialAssetId);
        if (initialTitle) setTitle(initialTitle);
        if (initialDescription) setDescription(initialDescription);
        if (
          initialPriority &&
          ['low', 'medium', 'high', 'critical'].includes(initialPriority)
        ) {
          setPriority(initialPriority as Priority);
        }
        if (initialAreaId) {
          setAreaId(initialAreaId);
        } else if (initialAssetId) {
          const match = assets.find((a) => a.id === initialAssetId);
          if (match?.area_id) setAreaId(match.area_id);
        }
        if (initialLocationId) setLocationId(initialLocationId);
        setRequiresMaintenance(true);
        setHasOperationalImpact(true);
        setClientRequestId(crypto.randomUUID());
        return;
      }

      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setClientRequestId(parsed.clientRequestId || crypto.randomUUID());
        setTitle(parsed.title || '');
        setCategoryId(parsed.categoryId || '');
        setSubcategoryId(parsed.subcategoryId || '');
        setPriority(parsed.priority || 'medium');
        setAreaId(parsed.areaId || '');
        setLocationId(parsed.locationId || '');
        setAssetId(parsed.assetId || '');
        setDescription(parsed.description || '');
        setHasOperationalImpact(parsed.hasOperationalImpact ?? false);
        setRequiresMaintenance(parsed.requiresMaintenance ?? false);
      } else {
        const newId = crypto.randomUUID();
        setClientRequestId(newId);
      }
    } catch {
      setClientRequestId(crypto.randomUUID());
    }
  }, [
    initialAssetId,
    initialAreaId,
    initialLocationId,
    initialInspectionId,
    initialTitle,
    initialDescription,
    initialPriority,
    assets,
  ]);

  // Save draft on change (only for direct reporting flow)
  useEffect(() => {
    if (initialAssetId || initialInspectionId) return; // Do not overwrite drafts from prefilled flows

    try {
      const draft = {
        clientRequestId,
        title,
        categoryId,
        subcategoryId,
        priority,
        areaId,
        locationId,
        assetId,
        description,
        hasOperationalImpact,
        requiresMaintenance,
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Ignore quota errors
    }
  }, [
    clientRequestId,
    title,
    categoryId,
    subcategoryId,
    priority,
    areaId,
    locationId,
    assetId,
    description,
    hasOperationalImpact,
    requiresMaintenance,
    initialAssetId,
    initialInspectionId,
  ]);

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  };

  // Filtered lists based on selection & warehouse
  const filteredSubcategories = subcategories.filter(s => s.category_id === categoryId);
  const filteredAreas = areas.filter(a => !activeWarehouseId || a.warehouse_id === activeWarehouseId);
  const filteredLocations = locations.filter(l => l.area_id === areaId);
  const filteredAssets = assets.filter(a => !activeWarehouseId || a.warehouse_id === activeWarehouseId);

  // Quick title suggestions
  const quickSuggestions = [
    'Pallet Rusak di Jalur Forklift',
    'Sensor Scanner Error',
    'Lampu Penerangan Mati',
    'Kebocoran Oli Mesin',
    'Selisih Jumlah Stok Barang',
  ];

  // Photo handlers with Async Compression
  const processFiles = async (filesArray: File[]) => {
    if (!filesArray || filesArray.length === 0) return;

    // Create initial processing items
    const newItems: PhotoItem[] = filesArray.map((file) => ({
      id: crypto.randomUUID(),
      rawFile: file,
      previewUrl: URL.createObjectURL(file),
      status: 'processing',
    }));

    setPhotos((prev) => [...prev, ...newItems]);

    // Process & compress each photo asynchronously
    for (const item of newItems) {
      try {
        const { blob } = await compressImage(item.rawFile, 1920, 0.82);
        setPhotos((prev) =>
          prev.map((p) =>
            p.id === item.id
              ? {
                  ...p,
                  compressedBlob: blob,
                  compressedSize: blob.size,
                  status: 'ready',
                }
              : p
          )
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Gagal memproses foto';
        setPhotos((prev) =>
          prev.map((p) =>
            p.id === item.id
              ? {
                  ...p,
                  status: 'error',
                  errorMessage: msg,
                }
              : p
          )
        );
      }
    }
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const filesArray = Array.from(files);
    if (e.target) e.target.value = '';
    await processFiles(filesArray);
  };

  const handleCameraCapture = async (file: File) => {
    await processFiles([file]);
  };

  const handleCameraBtnClick = () => {
    if (
      typeof window !== 'undefined' &&
      Boolean(navigator?.mediaDevices?.getUserMedia)
    ) {
      setIsCameraModalOpen(true);
    } else {
      cameraInputRef.current?.click();
    }
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const removed = prev.find(p => p.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter(p => p.id !== id);
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isAnyPhotoProcessing = photos.some((p) => p.status === 'processing');

  // Validation: Title >= 3 chars & Category is mandatory
  const isStep1Valid = title.trim().length >= 3 && Boolean(categoryId);

  const handleNext = () => {
    setErrorMessage(null);
    if (step === 1 && !isStep1Valid) {
      if (title.trim().length < 3) {
        setErrorMessage('Mohon isi judul kasus (minimal 3 karakter)');
      } else if (!categoryId) {
        setErrorMessage('Mohon pilih salah satu kategori kasus.');
      }
      return;
    }
    setStep((prev) => Math.min(4, prev + 1));
  };

  const handleBack = () => {
    if (submitting) return;
    setErrorMessage(null);
    if (step === 1) {
      router.push('/cases');
    } else {
      setStep((prev) => Math.max(1, prev - 1));
    }
  };

  // Helper to upload evidences
  const uploadEvidencesForCase = async (caseId: string): Promise<boolean> => {
    if (!activeWarehouseId) return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any;

    const readyPhotos = photos.filter((p) => p.status === 'ready' && p.compressedBlob);
    let allSucceeded = true;

    for (const photo of readyPhotos) {
      try {
        const storagePath = buildCaseEvidencePath(activeWarehouseId, caseId, 'jpg');
        await uploadFile(
          BUCKETS.CASE_EVIDENCES,
          storagePath,
          photo.compressedBlob!,
          'image/jpeg'
        );

        await supabase.rpc('add_case_evidence', {
          p_case_id: caseId,
          p_phase: 'before', // Initial report phase MUST be 'before'
          p_file_url: storagePath,
          p_file_name: photo.rawFile.name,
          p_file_size: photo.compressedSize || photo.rawFile.size,
          p_mime_type: 'image/jpeg',
          p_caption: 'Foto bukti pelaporan awal',
        });
      } catch (evErr) {
        console.error('Evidence upload failed for photo:', photo.id, evErr);
        allSucceeded = false;
      }
    }

    return allSucceeded;
  };

  // Submit Handler
  const handleSubmit = async () => {
    if (submitting) return; // Prevent double click
    if (isAnyPhotoProcessing) {
      setErrorMessage('Harap tunggu sampai seluruh foto selesai diproses.');
      return;
    }
    if (!activeWarehouseId) {
      setErrorMessage('Gudang aktif tidak terdeteksi. Silakan pilih gudang di header terlebih dahulu.');
      return;
    }
    if (!title.trim()) {
      setErrorMessage('Judul kasus wajib diisi.');
      setStep(1);
      return;
    }
    if (!categoryId) {
      setErrorMessage('Kategori kasus wajib dipilih.');
      setStep(1);
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setPartialEvidenceError(null);
    setSubmitStatusText('Mengirim laporan kasus...');

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any;

      // 1. Call create_case RPC
      const { data: caseId, error: createErr } = await supabase.rpc('create_case', {
        p_warehouse_id: activeWarehouseId,
        p_title: title.trim(),
        p_client_request_id: clientRequestId,
        p_description: description.trim() || null,
        p_category_id: categoryId || null,
        p_subcategory_id: subcategoryId || null,
        p_area_id: areaId || null,
        p_location_id: locationId || null,
        p_asset_id: assetId || null,
        p_inspection_id: inspectionContext ? inspectionContext.inspectionId : (initialInspectionId || null),
        p_priority: priority,
        p_has_operational_impact: hasOperationalImpact,
        p_requires_maintenance: requiresMaintenance,
        p_source: inspectionContext || initialInspectionId || initialSource === 'inspection' ? 'inspection' : 'direct',
      });

      if (createErr) {
        throw new Error(createErr.message || 'Gagal membuat kasus.');
      }

      setCreatedCaseId(caseId);

      // 2. Upload photo evidence if attached
      const readyPhotos = photos.filter((p) => p.status === 'ready');
      if (readyPhotos.length > 0 && caseId) {
        const evidenceSuccess = await uploadEvidencesForCase(caseId);
        if (!evidenceSuccess) {
          setPartialEvidenceError(
            'Laporan kasus berhasil dibuat, tetapi beberapa foto bukti gagal diunggah. Anda dapat mencoba unggah ulang sekarang atau melanjutkannya nanti.'
          );
          setSubmitting(false);
          return;
        }
      }

      // 3. Success -> Clear draft & Redirect
      setSubmitStatusText('Laporan berhasil dibuat! Mengalihkan...');
      clearDraft();
      setTimeout(() => {
        router.push(`/cases/${caseId}`);
      }, 500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem';
      setErrorMessage(msg);
      setSubmitting(false);
    }
  };

  // Retry Evidence Upload Handler
  const handleRetryEvidence = async () => {
    if (!createdCaseId) return;
    setSubmitting(true);
    setPartialEvidenceError(null);
    const success = await uploadEvidencesForCase(createdCaseId);
    if (success) {
      clearDraft();
      router.push(`/cases/${createdCaseId}`);
    } else {
      setPartialEvidenceError('Sebagian foto masih gagal diunggah. Silakan coba lagi atau buka detail kasus.');
      setSubmitting(false);
    }
  };

  const selectedCategoryName = categories.find(c => c.id === categoryId)?.name;
  const selectedSubcategoryName = subcategories.find(s => s.id === subcategoryId)?.name;
  const selectedAreaName = areas.find(a => a.id === areaId)?.name;
  const selectedLocationName = locations.find(l => l.id === locationId)?.name;
  const selectedAssetName = assets.find(a => a.id === assetId)?.name;

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-28">
      {/* ── Top Step Header & Progress Bar ──────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <button
            type="button"
            disabled={submitting}
            onClick={handleBack}
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all p-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{step === 1 ? 'Batal' : 'Kembali'}</span>
          </button>
          <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
            Langkah {step} dari 4
          </span>
        </div>

        {/* 4-Segment Progress Bar */}
        <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={cn(
                'rounded-full transition-all duration-300',
                s <= step ? 'bg-blue-600' : 'bg-slate-200'
              )}
            />
          ))}
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-start gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Partial Success (Evidence retry banner) */}
      {partialEvidenceError && createdCaseId && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs space-y-2.5 animate-in fade-in">
          <div className="flex items-start gap-2 text-amber-800 font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>{partialEvidenceError}</span>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              disabled={submitting}
              onClick={handleRetryEvidence}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 text-white font-bold text-xs shadow-xs hover:bg-amber-700 active:scale-95 disabled:opacity-50 transition-all"
            >
              <RotateCw className={cn('w-3.5 h-3.5', submitting && 'animate-spin')} />
              <span>Coba Unggah Ulang</span>
            </button>
            <button
              type="button"
              onClick={() => {
                clearDraft();
                router.push(`/cases/${createdCaseId}`);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 font-bold text-xs hover:bg-amber-100 transition-all"
            >
              <span>Lanjut ke Kasus</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* STEP 1: KEJADIAN                                                    */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {step === 1 && (
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4 animate-in fade-in slide-in-from-right-2 duration-150">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Apa yang Terjadi?
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Jelaskan masalah atau temuan yang Anda temukan
            </p>
          </div>

          {/* Existing Case Notice (Duplicate Protection) */}
          {inspectionContext?.existingCase && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 flex items-start gap-3 shadow-2xs">
              <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-amber-900">
                    Perhatian: Kasus Sudah Pernah Dibuat
                  </span>
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-white border border-amber-300 text-amber-900 rounded-md">
                    {inspectionContext.existingCase.case_number}
                  </span>
                  <span className="text-[10px] text-amber-800 uppercase font-semibold">
                    ({inspectionContext.existingCase.status})
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                  Inspeksi ini telah ditindaklanjuti dengan kasus #{inspectionContext.existingCase.case_number}. Anda dapat membuka kasus tersebut atau tetap membuat kasus baru.
                </p>
                <div className="pt-1">
                  <Link
                    href={`/cases/${inspectionContext.existingCase.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all shadow-xs"
                  >
                    <span>Buka Kasus #{inspectionContext.existingCase.case_number}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Inspection Reference Banner */}
          {(inspectionContext?.inspectionNumber || initialInspectionNumber) && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/90 flex items-start gap-3 shadow-2xs">
              <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-amber-900">
                    Dibuat dari Temuan Inspeksi QC
                  </span>
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-amber-100 border border-amber-300 text-amber-900 rounded-md">
                    {inspectionContext?.inspectionNumber || initialInspectionNumber}
                  </span>
                  {inspectionContext?.assetCode && (
                    <span className="text-[11px] text-slate-700 font-bold">
                      &bull; {inspectionContext.assetCode} ({inspectionContext.assetName})
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                  Data aset, area gudang, dan rincian temuan checklist NG telah diverifikasi secara authoritative dari server.
                </p>
                {inspectionContext?.ngFindings && inspectionContext.ngFindings.length > 0 && (
                  <div className="pt-1 border-t border-amber-200/60 space-y-1">
                    <span className="block text-[10px] font-extrabold uppercase text-amber-900">
                      Rincian Temuan NG:
                    </span>
                    <ul className="text-[11px] text-amber-900 space-y-0.5 list-disc list-inside font-medium">
                      {inspectionContext.ngFindings.map((ng, i) => (
                        <li key={i}>
                          <strong>{ng.label}</strong>
                          {ng.notes ? ` — ${ng.notes}` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Title Input */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Judul Kasus <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Conveyor belt macet di area sortir"
              className="w-full px-3.5 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              autoFocus
            />

            {/* Quick Suggestions Chips */}
            {!title && (
              <div className="pt-1">
                <p className="text-[10px] font-bold text-slate-400 mb-1">Contoh Cepat:</p>
                <div className="flex flex-wrap gap-1.5">
                  {quickSuggestions.map((sug, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setTitle(sug)}
                      className="text-[10.5px] font-semibold text-slate-600 bg-slate-100/80 hover:bg-blue-50 hover:text-blue-700 px-2.5 py-1 rounded-full transition-colors text-left"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Category Chips */}
          <div className="space-y-1.5 pt-1">
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Kategori Kasus
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {categories.map((cat) => {
                const isSelected = categoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setCategoryId(isSelected ? '' : cat.id);
                      setSubcategoryId('');
                    }}
                    className={cn(
                      'p-2.5 rounded-2xl border text-left transition-all active:scale-95',
                      isSelected
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                        : 'bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    <p className="text-xs font-bold leading-tight truncate">{cat.name}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subcategory Chips (Conditional) */}
          {filteredSubcategories.length > 0 && (
            <div className="space-y-1.5 pt-1 animate-in fade-in">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Subkategori ({selectedCategoryName})
              </label>
              <div className="flex flex-wrap gap-1.5">
                {filteredSubcategories.map((sub) => {
                  const isSelected = subcategoryId === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setSubcategoryId(isSelected ? '' : sub.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95',
                        isSelected
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      )}
                    >
                      {sub.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Priority Selection Cards */}
          <div className="space-y-1.5 pt-1">
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Tingkat Prioritas
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'low', label: 'Rendah', sla: 'SLA 72 Jam', icon: AlertCircle, color: 'text-slate-700' },
                { id: 'medium', label: 'Sedang', sla: 'SLA 24 Jam (Default)', icon: Sparkles, color: 'text-blue-600' },
                { id: 'high', label: 'Tinggi', sla: 'SLA 4 Jam', icon: AlertTriangle, color: 'text-orange-600' },
                { id: 'critical', label: 'Kritis', sla: 'SLA 1 Jam', icon: ShieldAlert, color: 'text-rose-600' },
              ].map((p) => {
                const isSelected = priority === p.id;
                const Icon = p.icon;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPriority(p.id as Priority)}
                    className={cn(
                      'p-3 rounded-2xl border text-left transition-all active:scale-95 flex items-start gap-2.5',
                      isSelected
                        ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500 shadow-2xs'
                        : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100'
                    )}
                  >
                    <Icon className={cn('w-4 h-4 shrink-0 mt-0.5', p.color)} />
                    <div>
                      <p className="text-xs font-extrabold text-slate-900">{p.label}</p>
                      <p className="text-[10px] font-medium text-slate-500">{p.sla}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* STEP 2: LOKASI                                                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {step === 2 && (
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4 animate-in fade-in slide-in-from-right-2 duration-150">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Di Mana Lokasi Kejadian?
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Pilih area dan lokasi spesifik di gudang
            </p>
          </div>

          {/* Active Warehouse Readonly Pill */}
          <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Gudang Aktif</p>
                <p className="text-xs font-extrabold text-slate-900">
                  {activeWarehouse ? `${activeWarehouse.warehouseCode} — ${activeWarehouse.warehouseName}` : 'Tidak Ada Gudang'}
                </p>
              </div>
            </div>
          </div>

          {/* Area Selection Chips */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Pilih Area Gudang
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {filteredAreas.map((area) => {
                const isSelected = areaId === area.id;
                return (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => {
                      setAreaId(isSelected ? '' : area.id);
                      setLocationId('');
                    }}
                    className={cn(
                      'p-2.5 rounded-2xl border text-left transition-all active:scale-95',
                      isSelected
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                        : 'bg-slate-50 border-slate-200/80 text-slate-800 hover:bg-slate-100'
                    )}
                  >
                    <p className="text-xs font-bold truncate">{area.name}</p>
                    <p className={cn('text-[10px] font-medium', isSelected ? 'text-blue-100' : 'text-slate-400')}>{area.code}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location Specific Chips (Filtered by Area) */}
          {filteredLocations.length > 0 && (
            <div className="space-y-1.5 pt-1 animate-in fade-in">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Lokasi Spesifik ({selectedAreaName})
              </label>
              <div className="flex flex-wrap gap-1.5">
                {filteredLocations.map((loc) => {
                  const isSelected = locationId === loc.id;
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => setLocationId(isSelected ? '' : loc.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95',
                        isSelected
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      )}
                    >
                      {loc.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Asset Selection (Optional) */}
          <Select
            label="Aset / Mesin Terkait (Opsional)"
            value={assetId}
            onChange={setAssetId}
            placeholder="-- Tidak Terkait Aset Tertentu --"
            searchable={true}
            clearable={true}
            searchPlaceholder="Cari kode atau nama aset..."
            options={filteredAssets.map((ast) => ({
              value: ast.id,
              label: `${ast.asset_code} — ${ast.name}`,
            }))}
          />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* STEP 3: DETAIL OPERASIONAL                                          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {step === 3 && (
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4 animate-in fade-in slide-in-from-right-2 duration-150">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Detail & Dampak
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Informasikan deskripsi kronologi dan urgensi penanganan
            </p>
          </div>

          {/* Description Textarea */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Deskripsi Kejadian (Opsional)
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ceritakan detail apa yang terlihat, perkiraan penyebab, atau tindakan darurat yang sudah dilakukan..."
              className="w-full px-3.5 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all leading-relaxed"
            />
          </div>

          {/* Operational Impact Switch */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-900">Ada Dampak Operasional?</p>
              <p className="text-[10.5px] text-slate-500">Menghambat picking, loading, atau aliran barang</p>
            </div>
            <button
              type="button"
              onClick={() => setHasOperationalImpact(!hasOperationalImpact)}
              className={cn(
                'w-12 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out',
                hasOperationalImpact ? 'bg-orange-500' : 'bg-slate-300'
              )}
            >
              <div
                className={cn(
                  'w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out',
                  hasOperationalImpact ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>

          {/* Requires Maintenance Switch */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-900">Perlu Tim Maintenance?</p>
              <p className="text-[10.5px] text-slate-500">Memerlukan teknisi mesin, listrik, atau perbaikan fisik</p>
            </div>
            <button
              type="button"
              onClick={() => setRequiresMaintenance(!requiresMaintenance)}
              className={cn(
                'w-12 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out',
                requiresMaintenance ? 'bg-blue-600' : 'bg-slate-300'
              )}
            >
              <div
                className={cn(
                  'w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out',
                  requiresMaintenance ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* STEP 4: BUKTI FOTO & REVIEW                                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {step === 4 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-150">
          {/* ── BUKTI DARI INSPEKSI QC (READ-ONLY SOURCE EVIDENCE) ── */}
          {inspectionContext && (
            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Bukti dari Inspeksi QC ({inspectionContext.inspectionNumber})
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Dokumentasi hasil audit inspeksi (Otomatis terhubung &bull; Read-Only)
                  </p>
                </div>
                <span className="text-[10.5px] font-extrabold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  {(inspectionContext.evidences || []).length} Foto
                </span>
              </div>

              {/* 1. Bukti Temuan NG */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-700">
                    Bukti Temuan NG
                  </span>
                </div>
                {(() => {
                  const ngEvidences = (inspectionContext.evidences || []).filter((e) => e.is_ng);
                  if (ngEvidences.length > 0) {
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {ngEvidences.map((ev, idx) => (
                          <button
                            key={ev.id}
                            type="button"
                            onClick={() => {
                              const globalIdx = (inspectionContext.evidences || []).findIndex(
                                (item) => item.id === ev.id
                              );
                              setViewingSourceEvidenceIdx(globalIdx >= 0 ? globalIdx : idx);
                            }}
                            className="relative aspect-square rounded-2xl overflow-hidden border border-rose-200 bg-slate-100 group cursor-pointer hover:ring-2 hover:ring-rose-500/50 transition-all shadow-2xs text-left"
                          >
                            <img
                              src={ev.signed_url || ''}
                              alt={ev.item_label || ev.file_name || 'Bukti Temuan NG'}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 pointer-events-none"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent flex flex-col justify-end p-2.5 pointer-events-none">
                              <span className="text-[10px] font-black text-white truncate drop-shadow-xs">
                                {ev.item_label || ev.file_name || `Foto NG ${idx + 1}`}
                              </span>
                            </div>
                            <div className="absolute top-2 right-2 p-1 rounded-full bg-slate-900/60 text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              <Maximize2 className="w-3 h-3" />
                            </div>
                          </button>
                        ))}
                      </div>
                    );
                  }
                  return (
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs text-slate-500 font-medium flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>Belum ada foto yang dilampirkan khusus pada poin NG.</span>
                    </div>
                  );
                })()}
              </div>

              {/* 2. Dokumentasi Inspeksi Lainnya */}
              {(() => {
                const otherEvidences = (inspectionContext.evidences || []).filter((e) => !e.is_ng);
                if (otherEvidences.length === 0) return null;
                return (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                        Dokumentasi Inspeksi Lainnya ({otherEvidences.length})
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {otherEvidences.map((ev, idx) => (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => {
                            const globalIdx = (inspectionContext.evidences || []).findIndex(
                              (item) => item.id === ev.id
                            );
                            setViewingSourceEvidenceIdx(globalIdx >= 0 ? globalIdx : idx);
                          }}
                          className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 group cursor-pointer hover:ring-2 hover:ring-amber-500/50 transition-all shadow-2xs text-left"
                        >
                          <img
                            src={ev.signed_url || ''}
                            alt={ev.item_label || ev.file_name || 'Dokumentasi Inspeksi'}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 pointer-events-none"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent flex flex-col justify-end p-2.5 pointer-events-none">
                            <span className="text-[10px] font-black text-white truncate drop-shadow-xs">
                              {ev.item_label || ev.file_name || `Foto ${idx + 1}`}
                            </span>
                          </div>
                          <div className="absolute top-2 right-2 p-1 rounded-full bg-slate-900/60 text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <Maximize2 className="w-3 h-3" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Photo Capture Card (User-Added Case Evidence) */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                {inspectionContext ? 'Tambahkan Bukti Kasus (Opsional)' : 'Lampirkan Bukti Foto'}
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {inspectionContext
                  ? 'Lampirkan foto tambahan khusus untuk penanganan kasus ini jika diperlukan'
                  : 'Ambil foto langsung dengan kamera atau pilih dari galeri'}
              </p>
            </div>

            {/* Hidden Inputs */}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={cameraInputRef}
              onChange={handlePhotoSelect}
              className="hidden"
            />
            <input
              type="file"
              accept="image/*"
              multiple
              ref={galleryInputRef}
              onChange={handlePhotoSelect}
              className="hidden"
            />

            {/* Photo Action Buttons */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={submitting || isAnyPhotoProcessing}
                onClick={handleCameraBtnClick}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200/80 active:scale-95 disabled:opacity-50 transition-all touch-target"
              >
                <Camera className="w-4 h-4" />
                <span>Buka Kamera</span>
              </button>

              <button
                type="button"
                disabled={submitting || isAnyPhotoProcessing}
                onClick={() => galleryInputRef.current?.click()}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 active:scale-95 disabled:opacity-50 transition-all touch-target"
              >
                <ImageIcon className="w-4 h-4" />
                <span>Pilih Galeri</span>
              </button>
            </div>

            {/* Photos Preview Grid with Status Overlays */}
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2.5 pt-2">
                {photos.map((p) => (
                  <div key={p.id} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs group">
                    <img
                      src={p.previewUrl}
                      alt="Preview bukti"
                      className="w-full h-full object-cover"
                    />

                    {/* Processing Overlay */}
                    {p.status === 'processing' && (
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px] flex flex-col items-center justify-center p-2 text-center text-white">
                        <Loader2 className="w-4 h-4 animate-spin mb-1 text-blue-400" />
                        <span className="text-[9.5px] font-bold leading-tight">Menyiapkan...</span>
                      </div>
                    )}

                    {/* Ready Badge */}
                    {p.status === 'ready' && (
                      <div className="absolute bottom-1 left-1 bg-slate-900/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                        <span>{formatFileSize(p.compressedSize)}</span>
                      </div>
                    )}

                    {/* Error Overlay */}
                    {p.status === 'error' && (
                      <div className="absolute inset-0 bg-rose-900/80 flex flex-col items-center justify-center p-1.5 text-center text-white">
                        <AlertCircle className="w-4 h-4 text-rose-300 mb-0.5" />
                        <span className="text-[9px] font-bold">Gagal</span>
                      </div>
                    )}

                    {/* Remove button */}
                    {!submitting && p.status !== 'processing' && (
                      <button
                        type="button"
                        onClick={() => removePhoto(p.id)}
                        className="absolute top-1.5 right-1.5 p-1 rounded-full bg-slate-900/75 text-white hover:bg-rose-600 transition-colors"
                        title="Hapus foto"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Review Summary Card */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Ringkasan Laporan
            </h3>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-bold text-slate-400 uppercase">Judul</span>
                  <PriorityBadge priority={priority} size="sm" />
                </div>
                <p className="font-extrabold text-slate-900 text-sm leading-snug">{title}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Kategori</p>
                  <p className="font-bold text-slate-800 truncate">
                    {selectedCategoryName || '-'} {selectedSubcategoryName ? `• ${selectedSubcategoryName}` : ''}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Lokasi</p>
                  <p className="font-bold text-slate-800 truncate">
                    {selectedAreaName || '-'} {selectedLocationName ? `• ${selectedLocationName}` : ''}
                  </p>
                </div>
              </div>

              {(hasOperationalImpact || requiresMaintenance || selectedAssetName) && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {hasOperationalImpact && (
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-orange-700 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
                      <AlertTriangle className="w-3 h-3" />
                      Dampak Operasional
                    </span>
                  )}
                  {requiresMaintenance && (
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                      <Wrench className="w-3 h-3" />
                      Butuh Maintenance
                    </span>
                  )}
                  {selectedAssetName && (
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full">
                      <Package className="w-3 h-3" />
                      {selectedAssetName}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Sticky Bottom Action Bar ─────────────────────────────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/80 p-3 shadow-[0_-4px_20px_rgba(15,23,42,0.06)]"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="max-w-xl mx-auto flex items-center gap-2.5">
          {step < 4 ? (
            <button
              type="button"
              disabled={submitting}
              onClick={handleNext}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all touch-target"
            >
              <span>Lanjut ke Langkah {step + 1}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting || isAnyPhotoProcessing}
              onClick={handleSubmit}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-gradient-to-tr from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700 text-white font-extrabold text-xs shadow-lg shadow-blue-500/30 active:scale-[0.98] disabled:opacity-60 transition-all touch-target"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{submitStatusText}</span>
                </>
              ) : isAnyPhotoProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyiapkan Foto...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Kirim Laporan Kasus Sekarang</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Camera Modal (Real in-app camera with live stream, capture & retake) ── */}
      <CameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={handleCameraCapture}
        onFallbackToFilePicker={() => cameraInputRef.current?.click()}
      />

      {/* ── Lightbox Modal for Source Inspection Photos ──────────────────── */}
      {viewingSourceEvidenceIdx !== null &&
        inspectionContext?.evidences &&
        inspectionContext.evidences[viewingSourceEvidenceIdx] && (
          <div className="fixed inset-0 z-[70] bg-slate-950/90 backdrop-blur-sm flex flex-col justify-between p-4 sm:p-6 animate-in fade-in">
            {/* Top Bar */}
            <div className="flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold bg-white/10 px-2.5 py-1 rounded-lg">
                  {viewingSourceEvidenceIdx + 1} / {inspectionContext.evidences.length}
                </span>
                <span className="text-xs font-bold text-slate-200 truncate max-w-[200px] sm:max-w-md">
                  {inspectionContext.evidences[viewingSourceEvidenceIdx].item_label ||
                    inspectionContext.evidences[viewingSourceEvidenceIdx].file_name ||
                    'Bukti Inspeksi'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewingSourceEvidenceIdx(null)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Image */}
            <div className="relative flex-1 flex items-center justify-center my-auto overflow-hidden py-4">
              <img
                src={inspectionContext.evidences[viewingSourceEvidenceIdx].signed_url || ''}
                alt="Foto Bukti Inspeksi"
                className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl"
              />

              {/* Prev button */}
              {viewingSourceEvidenceIdx > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewingSourceEvidenceIdx(viewingSourceEvidenceIdx - 1);
                  }}
                  className="absolute left-2 sm:left-4 p-2.5 rounded-full bg-slate-900/80 text-white hover:bg-slate-800 transition-all shadow-lg"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}

              {/* Next button */}
              {viewingSourceEvidenceIdx < inspectionContext.evidences.length - 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewingSourceEvidenceIdx(viewingSourceEvidenceIdx + 1);
                  }}
                  className="absolute right-2 sm:right-4 p-2.5 rounded-full bg-slate-900/80 text-white hover:bg-slate-800 transition-all shadow-lg"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Caption / Item Info Footer */}
            <div className="text-center text-white/80 text-xs shrink-0 pt-2">
              <p className="font-semibold text-slate-100">
                {inspectionContext.evidences[viewingSourceEvidenceIdx].item_label
                  ? `Checklist: ${inspectionContext.evidences[viewingSourceEvidenceIdx].item_label}`
                  : 'Bukti Temuan Inspeksi'}
              </p>
              <p className="text-[11px] text-slate-400">
                Otomatis terhubung ke kasus dari {inspectionContext.inspectionNumber}
              </p>
            </div>
          </div>
        )}
    </div>
  );
}
