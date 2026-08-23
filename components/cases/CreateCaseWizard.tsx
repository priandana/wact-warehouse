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
  RotateCw,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface CategoryItem {
  id: string;
  name: string;
  icon?: string | null;
  sort_order: number;
}

export interface SubcategoryItem {
  id: string;
  category_id: string;
  name: string;
  sort_order: number;
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
}: CreateCaseWizardProps) {
  const router = useRouter();
  const { activeWarehouse } = useActiveWarehouse();
  const activeWarehouseId = activeWarehouse?.warehouseId;

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
  const [title, setTitle] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [subcategoryId, setSubcategoryId] = useState<string>('');
  const [priority, setPriority] = useState<Priority>('medium');

  const [areaId, setAreaId] = useState<string>('');
  const [locationId, setLocationId] = useState<string>('');
  const [assetId, setAssetId] = useState<string>('');

  const [description, setDescription] = useState<string>('');
  const [hasOperationalImpact, setHasOperationalImpact] = useState<boolean>(false);
  const [requiresMaintenance, setRequiresMaintenance] = useState<boolean>(false);

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Initialize draft and clientRequestId
  useEffect(() => {
    try {
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
  }, []);

  // Persist draft on changes
  useEffect(() => {
    if (!clientRequestId) return;
    const draftData = {
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
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
    } catch {
      // ignore
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
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const filesArray = Array.from(files);
    if (e.target) e.target.value = '';

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

  // Validation
  const isStep1Valid = title.trim().length >= 3;

  const handleNext = () => {
    setErrorMessage(null);
    if (step === 1 && !isStep1Valid) {
      setErrorMessage('Mohon isi judul kasus (minimal 3 karakter)');
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

    for (let i = 0; i < readyPhotos.length; i++) {
      const photo = readyPhotos[i];
      setSubmitStatusText(`Mengunggah foto ${i + 1} dari ${readyPhotos.length}...`);
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

    setSubmitting(true);
    setErrorMessage(null);
    setPartialEvidenceError(null);
    setSubmitStatusText('Mengirim laporan kasus...');

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any;

      // 1. Call create_case RPC (source must be 'direct')
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
        p_priority: priority,
        p_has_operational_impact: hasOperationalImpact,
        p_requires_maintenance: requiresMaintenance,
        p_source: 'direct', // strictly 'direct' or 'inspection'
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
          <div className="space-y-1.5 pt-1">
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Aset / Mesin Terkait (Opsional)
            </label>
            <select
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              className="w-full py-2.5 px-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">-- Tidak Terkait Aset Tertentu --</option>
              {filteredAssets.map((ast) => (
                <option key={ast.id} value={ast.id}>
                  {ast.asset_code} — {ast.name}
                </option>
              ))}
            </select>
          </div>
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
          {/* Photo Capture Card */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Lampirkan Bukti Foto
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Ambil foto langsung dengan kamera atau pilih dari galeri
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
                onClick={() => cameraInputRef.current?.click()}
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
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 p-3 shadow-[0_-4px_20px_rgba(15,23,42,0.06)]">
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
    </div>
  );
}
