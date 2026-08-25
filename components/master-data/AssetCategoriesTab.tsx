'use client';

// components/master-data/AssetCategoriesTab.tsx
// Global Master Data Management for Asset Categories (Super Admin Only).

import React, { useState, useMemo } from 'react';
import {
  Wrench,
  Plus,
  Search,
  Edit2,
  Power,
  Globe,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { BaseModal, DeactivationConfirmModal } from './MasterDataModals';
import { MasterDataActionButton } from './MasterDataActionButton';
import {
  createAssetCategoryAction,
  updateAssetCategoryAction,
  toggleAssetCategoryActiveAction,
} from '@/app/actions/masterData';

export interface AssetCategoryRecord {
  id: string;
  name: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

interface AssetCategoriesTabProps {
  assetCategories: AssetCategoryRecord[];
  isSuperAdmin: boolean;
  onRefresh: () => void;
}

export function AssetCategoriesTab({
  assetCategories,
  isSuperAdmin,
  onRefresh,
}: AssetCategoriesTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AssetCategoryRecord | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<AssetCategoryRecord | null>(null);

  const filteredCategories = useMemo(() => {
    return assetCategories.filter((ac) => {
      if (statusFilter === 'active' && !ac.is_active) return false;
      if (statusFilter === 'inactive' && ac.is_active) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return ac.name.toLowerCase().includes(q) || (ac.icon && ac.icon.toLowerCase().includes(q));
      }
      return true;
    });
  }, [assetCategories, statusFilter, searchQuery]);

  const activeCount = assetCategories.filter((a) => a.is_active).length;

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-extrabold text-[11px] border border-purple-200/60">
              <Globe className="w-3 h-3" />
              <span>Global</span>
            </span>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Kategori Aset & Mesin</h2>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {activeCount} Kategori Aktif • Klasifikasi peralatan, mesin, dan infrastruktur gudang
          </p>
        </div>

        {isSuperAdmin ? (
          <button
            onClick={() => setCreateOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-xs transition-all touch-target"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Tambah Kategori Aset</span>
          </button>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200/70 text-amber-800 text-xs font-semibold">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Hanya Super Admin</span>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari kategori aset..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl shrink-0 self-start sm:self-auto">
          {(['all', 'active', 'inactive'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                statusFilter === st ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              {st === 'all' ? 'Semua' : st === 'active' ? 'Aktif' : 'Nonaktif'}
            </button>
          ))}
        </div>
      </div>

      {/* Asset Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredCategories.map((ac) => (
          <div
            key={ac.id}
            className={cn(
              'p-4 bg-white rounded-2xl border transition-all shadow-2xs flex flex-col justify-between gap-3',
              ac.is_active ? 'border-slate-200/80 hover:border-slate-300' : 'border-slate-200 bg-slate-50/50 opacity-75'
            )}
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold text-slate-400">#{ac.sort_order}</span>
                <span
                  className={cn(
                    'text-[10px] font-bold px-2 py-0.5 rounded-full',
                    ac.is_active
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  )}
                >
                  {ac.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-100/60">
                  <Wrench className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900 tracking-tight leading-snug break-words">
                  {ac.name}
                </h3>
              </div>
            </div>

            {isSuperAdmin && (
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 mt-0.5">
                <MasterDataActionButton
                  variant="edit"
                  onClick={() => setEditTarget(ac)}
                  title="Edit Kategori Aset"
                  aria-label={`Edit ${ac.name}`}
                />
                <MasterDataActionButton
                  variant={ac.is_active ? 'deactivate' : 'activate'}
                  onClick={() => setDeactivateTarget(ac)}
                  title={ac.is_active ? 'Nonaktifkan Kategori Aset' : 'Aktifkan Kategori Aset'}
                  aria-label={`${ac.is_active ? 'Nonaktifkan' : 'Aktifkan'} ${ac.name}`}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── CREATE MODAL ── */}
      {createOpen && (
        <CreateAssetCategoryModalForm
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSuccess={() => {
            setCreateOpen(false);
            onRefresh();
          }}
        />
      )}

      {/* ── EDIT MODAL ── */}
      {editTarget && (
        <EditAssetCategoryModalForm
          category={editTarget}
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={() => {
            setEditTarget(null);
            onRefresh();
          }}
        />
      )}

      {/* ── DEACTIVATION CONFIRM MODAL ── */}
      {deactivateTarget && (
        <DeactivationConfirmModal
          open={!!deactivateTarget}
          onClose={() => setDeactivateTarget(null)}
          title={deactivateTarget.is_active ? 'Nonaktifkan Kategori Aset' : 'Aktifkan Kategori Aset'}
          itemName={deactivateTarget.name}
          isDeactivating={deactivateTarget.is_active}
          onConfirm={async () => {
            const res = await toggleAssetCategoryActiveAction(deactivateTarget.id, !deactivateTarget.is_active);
            if (!res.success) throw new Error(res.error);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

function CreateAssetCategoryModalForm({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('tool');
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await createAssetCategoryAction({ name, icon, sortOrder });
      if (!res.success) throw new Error(res.error);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Gagal membuat kategori aset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseModal open={open} onClose={onClose} title="Tambah Kategori Aset" icon={Wrench}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Nama Kategori Aset <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Contoh: Conveyor System"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Icon Identifier</label>
          <input
            type="text"
            placeholder="tool, truck, box, monitor..."
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Urutan (Sort Order)</label>
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all touch-target"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-xs font-bold text-white shadow-xs transition-all touch-target flex items-center justify-center"
          >
            {loading ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Simpan Kategori'}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}

function EditAssetCategoryModalForm({
  category,
  open,
  onClose,
  onSuccess,
}: {
  category: AssetCategoryRecord;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(category.name);
  const [icon, setIcon] = useState(category.icon || 'tool');
  const [sortOrder, setSortOrder] = useState<number>(category.sort_order);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await updateAssetCategoryAction({ id: category.id, name, icon, sortOrder });
      if (!res.success) throw new Error(res.error);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Gagal memperbarui kategori aset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseModal open={open} onClose={onClose} title="Edit Kategori Aset" icon={Wrench}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Nama Kategori Aset <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Icon Identifier</label>
          <input
            type="text"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Urutan (Sort Order)</label>
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all touch-target"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-xs font-bold text-white shadow-xs transition-all touch-target flex items-center justify-center"
          >
            {loading ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Perbarui Kategori'}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}
