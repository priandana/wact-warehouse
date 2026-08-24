'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ClipboardCheck,
  ArrowLeft,
  Search,
  Layers,
  MapPin,
  QrCode,
  AlertCircle,
  FileEdit,
  Loader2,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Package,
} from 'lucide-react';
import { useActiveWarehouse } from '@/components/shared/layout/AppShellProvider';
import { startInspectionAction } from '@/app/actions/inspections';
import { QRScannerModal } from '@/components/assets/QRScannerModal';
import { Select } from '@/components/shared/Select';

export interface AssetItem {
  id: string;
  warehouse_id: string;
  asset_code: string;
  name: string;
  category_id?: string | null;
  area_id?: string | null;
  location_id?: string | null;
  status: string;
  last_inspection_at?: string | null;
  next_inspection_at?: string | null;
  category?: { id: string; name: string } | null;
  area?: { name: string } | null;
  location?: { name: string } | null;
}

export interface TemplateItem {
  id: string;
  name: string;
  category_id?: string | null;
  description?: string | null;
  inspection_interval_days?: number | null;
  is_active: boolean;
  category?: { id: string; name: string } | null;
  sections?: Array<{
    id: string;
    title: string;
    items?: Array<{ id: string; label: string; is_required: boolean }>;
  }>;
}

export interface ActiveDraftItem {
  id: string;
  inspection_number: string;
  asset_id: string;
  started_at: string;
}

interface StartInspectionWizardProps {
  assets: AssetItem[];
  templates: TemplateItem[];
  activeDrafts: ActiveDraftItem[];
  initialAssetId?: string;
  warehouses: Array<{ id: string; code: string; name: string }>;
}

export function StartInspectionWizard({
  assets,
  templates,
  activeDrafts,
  initialAssetId,
  warehouses,
}: StartInspectionWizardProps) {
  const router = useRouter();
  const { activeWarehouseId } = useActiveWarehouse();

  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(
    activeWarehouseId || (warehouses[0]?.id ?? '')
  );
  const [selectedAssetId, setSelectedAssetId] = useState<string>(initialAssetId || '');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Synchronize when active warehouse hydrates from AppShellProvider
  useEffect(() => {
    if (activeWarehouseId && activeWarehouseId !== selectedWarehouseId) {
      setSelectedWarehouseId(activeWarehouseId);
      setSelectedAssetId('');
      setSelectedTemplateId('');
    }
  }, [activeWarehouseId]);

  const handleWarehouseChange = (newWarehouseId: string) => {
    setSelectedWarehouseId(newWarehouseId);
    setSelectedAssetId('');
    setSelectedTemplateId('');
    setServerError(null);
  };

  // Filter assets by selected warehouse
  const warehouseAssets = useMemo(() => {
    return assets.filter((a) => a.warehouse_id === selectedWarehouseId && a.status !== 'retired');
  }, [assets, selectedWarehouseId]);

  // Selected asset object
  const selectedAsset = useMemo(() => {
    return warehouseAssets.find((a) => a.id === selectedAssetId) || null;
  }, [warehouseAssets, selectedAssetId]);

  // Filter templates matching the selected asset's category
  const matchingTemplates = useMemo(() => {
    if (!selectedAsset) return [];
    return templates.filter((t) => {
      if (!t.is_active) return false;
      // Match category or global template
      if (!t.category_id) return true;
      return t.category_id === selectedAsset.category_id;
    });
  }, [templates, selectedAsset]);

  // Auto-select template if only 1 matching
  useMemo(() => {
    if (matchingTemplates.length === 1 && !selectedTemplateId) {
      setSelectedTemplateId(matchingTemplates[0].id);
    } else if (matchingTemplates.length > 0 && !matchingTemplates.some((t) => t.id === selectedTemplateId)) {
      setSelectedTemplateId(matchingTemplates[0]?.id || '');
    }
  }, [matchingTemplates, selectedTemplateId]);

  // Check if selected asset has active draft
  const activeDraft = useMemo(() => {
    if (!selectedAssetId) return null;
    return activeDrafts.find((d) => d.asset_id === selectedAssetId) || null;
  }, [activeDrafts, selectedAssetId]);

  // Filtered asset search list
  const filteredAssets = useMemo(() => {
    if (!assetSearchQuery.trim()) return warehouseAssets;
    const q = assetSearchQuery.toLowerCase().trim();
    return warehouseAssets.filter(
      (a) =>
        a.asset_code.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.category?.name?.toLowerCase().includes(q) ||
        a.area?.name?.toLowerCase().includes(q)
    );
  }, [warehouseAssets, assetSearchQuery]);

  const handleQRScan = (detectedCode: string) => {
    setIsQRScannerOpen(false);
    const cleanCode = detectedCode.replace(/^WACT-/, '').trim().toUpperCase();
    const found = warehouseAssets.find(
      (a) => a.asset_code.toUpperCase() === cleanCode || `WACT-${a.asset_code.toUpperCase()}` === detectedCode.toUpperCase()
    );

    if (found) {
      setSelectedAssetId(found.id);
      setServerError(null);
    } else {
      setServerError(`Aset dengan kode QR "${detectedCode}" tidak ditemukan di gudang ini.`);
    }
  };

  const handleStartInspection = async () => {
    if (!selectedWarehouseId || !selectedAssetId || !selectedTemplateId) {
      setServerError('Harap lengkapi pemilihan aset dan template inspeksi.');
      return;
    }

    setIsSubmitting(true);
    setServerError(null);

    try {
      const res = await startInspectionAction({
        warehouseId: selectedWarehouseId,
        assetId: selectedAssetId,
        templateId: selectedTemplateId,
      });

      if (res.success && res.inspectionId) {
        router.push(`/inspections/${res.inspectionId}`);
      } else {
        setServerError(res.error || 'Gagal memulai inspeksi.');
        setIsSubmitting(false);
      }
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ── 1. Top Back Navigation ──────────────────────────────────────── */}
      <Link
        href="/inspections"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Kembali ke Daftar Inspeksi</span>
      </Link>

      {/* ── 2. Header Banner Card ───────────────────────────────────────── */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs p-4 sm:p-6 space-y-1 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50/50 via-indigo-50/20 to-transparent rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/70 shadow-2xs shrink-0">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Mulai Sesi Inspeksi QC
            </h1>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Pilih aset gudang dan template checklist standar untuk memulai audit fisik
            </p>
          </div>
        </div>
      </div>

      {serverError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-start gap-2.5 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">{serverError}</div>
        </div>
      )}

      {/* ── 3. Step 1: Warehouse & Asset Selection ──────────────────────── */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-2xs">
              1
            </span>
            <h2 className="text-sm font-black text-slate-900">
              Pilih Aset yang Akan Diinspeksi
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setIsQRScannerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors active:scale-95"
          >
            <QrCode className="w-3.5 h-3.5 text-blue-600" />
            <span>Scan QR Aset</span>
          </button>
        </div>

        {/* Warehouse Picker (if multiple) */}
        {warehouses.length > 1 && (
          <Select
            label="Gudang Operasional"
            value={selectedWarehouseId}
            onChange={handleWarehouseChange}
            options={warehouses.map((w) => ({
              value: w.id,
              label: `${w.code} - ${w.name}`,
            }))}
          />
        )}

        {/* Asset Search & Selector */}
        <div className="space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={assetSearchQuery}
              onChange={(e) => setAssetSearchQuery(e.target.value)}
              placeholder="Ketik kode aset (contoh: BDG-LS-01) atau nama alat..."
              className="w-full text-xs rounded-xl bg-slate-50 border border-slate-200 pl-9 pr-4 py-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Asset Choice Cards */}
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1 rounded-2xl p-2 bg-slate-50/70 border border-slate-200/80">
            {filteredAssets.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Tidak ada aset yang sesuai di gudang ini.
              </div>
            ) : (
              filteredAssets.map((asset) => {
                const isSelected = selectedAssetId === asset.id;
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => {
                      setSelectedAssetId(asset.id);
                      setServerError(null);
                    }}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-blue-50/90 border border-blue-300 shadow-2xs ring-1 ring-blue-500/30'
                        : 'bg-white border border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60 shadow-2xs">
                          {asset.asset_code}
                        </span>
                        <span className="text-xs font-black text-slate-900 truncate">
                          {asset.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                        {asset.category?.name && (
                          <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10.5px]">
                            {asset.category.name}
                          </span>
                        )}
                        <span>&bull;</span>
                        <span>{asset.area?.name || 'Area Belum Diatur'}</span>
                      </div>
                    </div>

                    {isSelected && (
                      <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Draft Conflict Notice (if active draft exists) */}
      {activeDraft && (
        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-amber-50 border border-amber-200/90 shadow-2xs space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <h3 className="text-xs font-black text-amber-900">
                Aset Memiliki Sesi Draft yang Sedang Berjalan
              </h3>
              <p className="text-xs text-amber-800 leading-relaxed">
                Aset ini telah dimulai inspeksinya pada nomor{' '}
                <span className="font-mono font-bold text-amber-950">
                  {activeDraft.inspection_number}
                </span>{' '}
                dan belum diselesaikan. Untuk menjaga integritas data, Anda dapat langsung melanjutkan draft ini.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Link
              href={`/inspections/${activeDraft.id}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-xs active:scale-95 transition-all"
            >
              <FileEdit className="w-4 h-4" />
              <span>Lanjutkan Sesi Draft Sekarang</span>
            </Link>
          </div>
        </div>
      )}

      {/* ── 4. Step 2: Template Selection (Category-Matched) ─────────────── */}
      {selectedAsset && !activeDraft && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs p-4 sm:p-6 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-2xs">
                2
              </span>
              <h2 className="text-sm font-black text-slate-900">
                Pilih Template Checklist QC
              </h2>
            </div>

            <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-lg">
              Kategori: {selectedAsset.category?.name || 'Semua'}
            </span>
          </div>

          {matchingTemplates.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
              <Package className="w-8 h-8 text-slate-300 mx-auto" />
              <h4 className="text-xs font-extrabold text-slate-800">
                Belum Ada Template untuk Kategori Ini
              </h4>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Kategori "{selectedAsset.category?.name || 'Aset Ini'}" belum memiliki template checklist aktif.
                Silakan hubungi Administrator untuk membuat template baru.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {matchingTemplates.map((tpl) => {
                const isSelected = selectedTemplateId === tpl.id;
                const sectionCount = tpl.sections?.length || 0;
                const itemCount =
                  tpl.sections?.reduce((acc, s) => acc + (s.items?.length || 0), 0) || 0;

                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(tpl.id)}
                    className={`text-left p-4 rounded-xl border transition-all space-y-2 ${
                      isSelected
                        ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20 shadow-2xs'
                        : 'bg-white border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <h4 className="text-xs sm:text-sm font-black text-slate-900">
                          {tpl.name}
                        </h4>
                        {tpl.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-2">
                            {tpl.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 text-[10.5px] font-bold text-slate-400 pt-1.5 border-t border-slate-100/80 flex-wrap">
                      <span>{sectionCount} Bagian / Section</span>
                      <span>&bull;</span>
                      <span>{itemCount} Poin Checklist</span>
                      <span>&bull;</span>
                      <span>
                        Jadwal:{' '}
                        {tpl.inspection_interval_days
                          ? `Setiap ${tpl.inspection_interval_days} Hari`
                          : 'Manual / Rutin'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Action Button */}
          {matchingTemplates.length > 0 && (
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={handleStartInspection}
                disabled={isSubmitting || !selectedTemplateId}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-xs active:scale-95 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memulai Sesi Inspeksi...</span>
                  </>
                ) : (
                  <>
                    <span>Mulai Checklist Inspeksi</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* QR Scanner Modal */}
      {isQRScannerOpen && (
        <QRScannerModal
          isOpen={isQRScannerOpen}
          onClose={() => setIsQRScannerOpen(false)}
          onScanSuccess={handleQRScan}
        />
      )}
    </div>
  );
}
