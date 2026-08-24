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

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [qrAsset, setQrAsset] = useState<AssetRecord | null>(null);

  const hasActiveFilters = Boolean(
    searchQuery || selectedCategory || selectedArea || selectedCondition || selectedStatus
  );

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

  return (
    <div className="space-y-4">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Aset & Mesin Gudang</span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
              {filteredAssets.length} Aset
            </span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manajemen inventaris peralatan, riwayat inspeksi, dan pelaporan kendala &bull; {warehouseName}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Scan QR Button (Always available to all roles) */}
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs active:scale-95 transition-all"
          >
            <Scan className="w-4 h-4 text-blue-600" />
            <span>Scan QR</span>
          </button>

          {/* Add Asset (Coordinator / Admin only) */}
          {canManageAsset && (
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Aset</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kode aset, nama, atau merek..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 border-t border-slate-100">
            <span>
              Menampilkan <strong>{filteredAssets.length}</strong> dari {initialAssets.length} aset
            </span>
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center gap-1 font-bold text-blue-600 hover:text-blue-700"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filter</span>
            </button>
          </div>
        )}
      </div>

      {/* Content: Empty State vs Desktop Table vs Mobile Cards */}
      {filteredAssets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Tidak ada aset ditemukan</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {hasActiveFilters
                ? 'Coba sesuaikan kata kunci pencarian atau reset filter untuk melihat daftar aset.'
                : 'Belum ada master aset yang terdaftar pada gudang ini. Tambahkan aset pertama Anda.'}
            </p>
          </div>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={resetFilters}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors"
            >
              Reset Filter
            </button>
          ) : canManageAsset ? (
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-all inline-flex items-center gap-1.5"
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
          <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-3">
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

      {/* Modals */}
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
