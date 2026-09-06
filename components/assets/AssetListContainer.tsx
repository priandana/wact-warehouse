'use client';

import { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  Scan,
  Package,
  X,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { AssetRecord, AssetCard } from './AssetCard';
import { AssetTableView } from './AssetTableView';
import { CreateAssetModal } from './CreateAssetModal';
import { AssetQRModal } from './AssetQRModal';
import { QRScannerModal } from './QRScannerModal';
import { Select } from '@/components/shared/Select';
import { cn } from '@/lib/utils/cn';

interface CategoryItem {
  id: string;
  name: string;
}

interface AreaItem {
  id: string;
  name: string;
  warehouse_id: string;
}

interface LocationItem {
  id: string;
  name: string;
  area_id: string;
}

interface AssetListContainerProps {
  initialAssets: AssetRecord[];
  warehouseId: string;
  warehouseName: string;
  categories: CategoryItem[];
  areas: AreaItem[];
  locations: LocationItem[];
  canManageAsset: boolean;
}

export function AssetListContainer({
  initialAssets,
  warehouseId,
  warehouseName,
  categories,
  areas,
  locations,
  canManageAsset,
}: AssetListContainerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [qrAsset, setQrAsset] = useState<AssetRecord | null>(null);

  const activeFilterCount = [
    selectedCategory,
    selectedArea,
    selectedCondition,
    selectedStatus,
  ].filter(Boolean).length;

  const hasActiveFilters = Boolean(searchQuery || activeFilterCount > 0);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedArea('');
    setSelectedCondition('');
    setSelectedStatus('');
  };

  const filteredAssets = useMemo(() => {
    return initialAssets.filter((item) => {
      // Search text
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const codeMatch = item.asset_code?.toLowerCase().includes(q);
        const nameMatch = item.name?.toLowerCase().includes(q);
        const brandMatch = item.specification?.brand?.toLowerCase().includes(q);
        const modelMatch = item.specification?.model?.toLowerCase().includes(q);
        if (!codeMatch && !nameMatch && !brandMatch && !modelMatch) return false;
      }

      // Category filter
      if (selectedCategory && item.category_id !== selectedCategory) {
        return false;
      }

      // Area filter
      if (selectedArea && item.area_id !== selectedArea) {
        return false;
      }

      // Condition filter
      if (selectedCondition) {
        const cond = item.specification?.condition || 'good';
        if (cond !== selectedCondition) return false;
      }

      // Status filter
      if (selectedStatus && item.status !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [
    initialAssets,
    searchQuery,
    selectedCategory,
    selectedArea,
    selectedCondition,
    selectedStatus,
  ]);

  // Derived metrics from authoritative initialAssets
  const totalCount = initialAssets.length;
  const activeCount = initialAssets.filter((a) => a.status === 'active').length;
  const needsAttentionCount = initialAssets.filter(
    (a) =>
      (a.openCasesCount && a.openCasesCount > 0) ||
      a.specification?.condition === 'damaged' ||
      a.specification?.condition === 'critical'
  ).length;
  const nonActiveCount = initialAssets.filter(
    (a) => a.status === 'maintenance' || a.status === 'inactive' || a.status === 'retired'
  ).length;

  return (
    <div className="space-y-4">
      {/* ── 1. Top Action Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 neu-raised p-4 sm:p-5 rounded-3xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Aset & Mesin
            </h1>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full neu-pill-active text-blue-700 dark:text-blue-400">
              {filteredAssets.length} Aset
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Inventaris peralatan gudang, riwayat inspeksi, dan kendala operasional &bull; {warehouseName}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Scan QR Button */}
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="neu-btn-secondary flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all"
          >
            <Scan className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Scan QR</span>
          </button>

          {/* Add Asset (Coordinator / Admin only) */}
          {canManageAsset && (
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="fintech-btn-primary flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl text-white font-bold text-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Aset</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 2. Authoritative Overview Metrics ───────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="p-3.5 sm:p-4 rounded-3xl neu-raised">
          <span className="text-[10px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Total Aset
          </span>
          <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-1 block leading-none">
            {totalCount}
          </span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-3xl neu-raised">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-[10px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Aktif (Ready)
            </span>
          </div>
          <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block leading-none">
            {activeCount}
          </span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-3xl neu-raised">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
            <span className="text-[10px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Perlu Perhatian
            </span>
          </div>
          <span className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 block leading-none">
            {needsAttentionCount}
          </span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-3xl neu-raised">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
            <span className="text-[10px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 truncate">
              Nonaktif / Maint.
            </span>
          </div>
          <span className="text-xl sm:text-2xl font-black text-slate-700 dark:text-slate-300 mt-1 block leading-none">
            {nonActiveCount}
          </span>
        </div>
      </div>

      {/* ── 3. Search & Filter Bar ───────────────────────────────────────── */}
      <div className="neu-raised p-3.5 sm:p-4 rounded-3xl space-y-2.5">
        {/* Desktop Filter Row */}
        <div className="hidden lg:grid lg:grid-cols-5 gap-2">
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kode aset, nama, atau merek..."
              className="w-full pl-9 pr-8 py-2.5 rounded-2xl neu-inset text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <Select
            value={selectedCategory}
            onChange={setSelectedCategory}
            variant="filter"
            size="sm"
            placeholder="Semua Kategori"
            options={[
              { value: '', label: 'Semua Kategori' },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />

          {/* Area Filter */}
          <Select
            value={selectedArea}
            onChange={setSelectedArea}
            variant="filter"
            size="sm"
            placeholder="Semua Area"
            options={[
              { value: '', label: 'Semua Area' },
              ...areas.map((a) => ({ value: a.id, label: a.name })),
            ]}
          />

          {/* Status & Condition Filters */}
          <div className="grid grid-cols-2 gap-1.5">
            <Select
              value={selectedCondition}
              onChange={setSelectedCondition}
              variant="filter"
              size="sm"
              placeholder="Kondisi"
              options={[
                { value: '', label: 'Kondisi' },
                { value: 'good', label: 'Baik' },
                { value: 'fair', label: 'Cukup' },
                { value: 'damaged', label: 'Rusak' },
                { value: 'critical', label: 'Kritis' },
              ]}
            />

            <Select
              value={selectedStatus}
              onChange={setSelectedStatus}
              variant="filter"
              size="sm"
              placeholder="Status"
              options={[
                { value: '', label: 'Status' },
                { value: 'active', label: 'Aktif' },
                { value: 'maintenance', label: 'Maintenance' },
                { value: 'inactive', label: 'Non-Aktif' },
                { value: 'retired', label: 'Afkir' },
              ]}
            />
          </div>
        </div>

        {/* Mobile Filter Row */}
        <div className="lg:hidden space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kode aset, nama, merek..."
                className="w-full pl-9 pr-8 py-2.5 rounded-2xl neu-inset text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 rounded-2xl border text-xs font-bold transition-all active:scale-95',
                activeFilterCount > 0 || isMobileFilterOpen
                  ? 'neu-pill-active text-blue-700 dark:text-blue-400'
                  : 'neu-btn-secondary'
              )}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Expandable Mobile Filters */}
          {isMobileFilterOpen && (
            <div className="p-3 neu-inset-sm rounded-2xl space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Select
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                  variant="filter"
                  size="sm"
                  placeholder="Semua Kategori"
                  options={[
                    { value: '', label: 'Semua Kategori' },
                    ...categories.map((c) => ({ value: c.id, label: c.name })),
                  ]}
                />

                <Select
                  value={selectedArea}
                  onChange={setSelectedArea}
                  variant="filter"
                  size="sm"
                  placeholder="Semua Area"
                  options={[
                    { value: '', label: 'Semua Area' },
                    ...areas.map((a) => ({ value: a.id, label: a.name })),
                  ]}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={selectedCondition}
                  onChange={setSelectedCondition}
                  variant="filter"
                  size="sm"
                  placeholder="Kondisi"
                  options={[
                    { value: '', label: 'Kondisi' },
                    { value: 'good', label: 'Baik' },
                    { value: 'fair', label: 'Cukup' },
                    { value: 'damaged', label: 'Rusak' },
                    { value: 'critical', label: 'Kritis' },
                  ]}
                />

                <Select
                  value={selectedStatus}
                  onChange={setSelectedStatus}
                  variant="filter"
                  size="sm"
                  placeholder="Status"
                  options={[
                    { value: '', label: 'Status' },
                    { value: 'active', label: 'Aktif' },
                    { value: 'maintenance', label: 'Maintenance' },
                    { value: 'inactive', label: 'Non-Aktif' },
                    { value: 'retired', label: 'Afkir' },
                  ]}
                />
              </div>
            </div>
          )}
        </div>

        {/* Active Filter Bar & Reset */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200/40 dark:border-slate-800/60">
            <span>
              Menampilkan <strong>{filteredAssets.length}</strong> dari {initialAssets.length} aset
            </span>
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filter</span>
            </button>
          </div>
        )}
      </div>

      {/* ── 4. Content: Empty State vs Desktop Table vs Mobile Cards ─────────── */}
      {filteredAssets.length === 0 ? (
        <div className="neu-raised rounded-3xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl neu-icon-well text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Tidak ada aset ditemukan</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
              {hasActiveFilters
                ? 'Coba sesuaikan kata kunci pencarian atau reset filter untuk melihat daftar aset.'
                : 'Belum ada master aset yang terdaftar pada gudang ini. Tambahkan aset pertama Anda.'}
            </p>
          </div>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={resetFilters}
              className="neu-btn-secondary px-4 py-2 rounded-2xl font-bold text-xs transition-colors"
            >
              Reset Filter
            </button>
          ) : canManageAsset ? (
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="fintech-btn-primary px-4 py-2 rounded-2xl text-white font-bold text-xs transition-all inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Aset Sekarang</span>
            </button>
          ) : null}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <AssetTableView
            assets={filteredAssets}
            onOpenQR={(ast) => setQrAsset(ast)}
          />

          {/* Mobile Cards View */}
          <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filteredAssets.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onOpenQR={(ast) => setQrAsset(ast)}
              />
            ))}
          </div>
        </>
      )}

      {/* ── 5. Modals ────────────────────────────────────────────────────── */}
      {isCreateOpen && (
        <CreateAssetModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          warehouseId={warehouseId}
          categories={categories}
          areas={areas}
          locations={locations}
        />
      )}

      {isScannerOpen && (
        <QRScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          activeWarehouseId={warehouseId}
        />
      )}

      {qrAsset && (
        <AssetQRModal
          isOpen={Boolean(qrAsset)}
          onClose={() => setQrAsset(null)}
          asset={{
            id: qrAsset.id,
            asset_code: qrAsset.asset_code,
            name: qrAsset.name,
            warehouse_name: warehouseName,
            area_name: qrAsset.area?.name,
            location_name: qrAsset.location?.name,
          }}
        />
      )}
    </div>
  );
}
