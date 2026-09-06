'use client';

// components/master-data/CaseCategoriesTab.tsx
// Global Master Data Management for Case Categories and Subcategories (Super Admin Only).

import React, { useState, useMemo } from 'react';
import {
  FolderTree,
  Plus,
  Search,
  Edit2,
  Power,
  ChevronDown,
  ChevronUp,
  Globe,
  ShieldAlert,
  Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { BaseModal, DeactivationConfirmModal } from './MasterDataModals';
import { MasterDataActionButton } from './MasterDataActionButton';
import {
  createCaseCategoryAction,
  updateCaseCategoryAction,
  toggleCaseCategoryActiveAction,
  createCaseSubcategoryAction,
  updateCaseSubcategoryAction,
  toggleCaseSubcategoryActiveAction,
} from '@/app/actions/masterData';

export interface CaseCategoryRecord {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface CaseSubcategoryRecord {
  id: string;
  category_id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

interface CaseCategoriesTabProps {
  categories: CaseCategoryRecord[];
  subcategories: CaseSubcategoryRecord[];
  isSuperAdmin: boolean;
  onRefresh: () => void;
}

export function CaseCategoriesTab({
  categories,
  subcategories,
  isSuperAdmin,
  onRefresh,
}: CaseCategoriesTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

  // Modals state
  const [createCatOpen, setCreateCatOpen] = useState(false);
  const [editCatTarget, setEditCatTarget] = useState<CaseCategoryRecord | null>(null);
  const [createSubTargetCat, setCreateSubTargetCat] = useState<CaseCategoryRecord | null>(null);
  const [editSubTarget, setEditSubTarget] = useState<CaseSubcategoryRecord | null>(null);

  // Deactivate modal state
  const [deactivateTarget, setDeactivateTarget] = useState<{
    type: 'category' | 'subcategory';
    id: string;
    name: string;
    currentActive: boolean;
  } | null>(null);

  const toggleExpand = (catId: string) => {
    setExpandedCats((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  // Group subcategories by category_id
  const subcategoriesByCategory = useMemo(() => {
    const map = new Map<string, CaseSubcategoryRecord[]>();
    for (const sub of subcategories) {
      if (!map.has(sub.category_id)) map.set(sub.category_id, []);
      map.get(sub.category_id)!.push(sub);
    }
    return map;
  }, [subcategories]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      if (statusFilter === 'active' && !cat.is_active) return false;
      if (statusFilter === 'inactive' && cat.is_active) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCat = cat.name.toLowerCase().includes(q);
        const subs = subcategoriesByCategory.get(cat.id) || [];
        const matchSub = subs.some((s) => s.name.toLowerCase().includes(q));
        return matchCat || matchSub;
      }
      return true;
    });
  }, [categories, statusFilter, searchQuery, subcategoriesByCategory]);

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 bg-[#EEF2F7] dark:bg-[#131C31] rounded-3xl neu-raised border border-black/[0.04] dark:border-white/[0.05]">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full neu-inset-sm bg-purple-500/10 text-purple-700 dark:text-purple-400 font-extrabold text-[11px] border border-purple-500/20">
              <Globe className="w-3 h-3" />
              <span>Global</span>
            </span>
            <h2 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight">Kategori & Subkategori Kasus</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Taksonomi pelaporan kerusakan berlaku universal untuk semua gudang
          </p>
        </div>

        {isSuperAdmin ? (
          <button
            onClick={() => setCreateCatOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl fintech-btn-primary text-white font-bold text-xs shadow-xs transition-all touch-target"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Tambah Kategori</span>
          </button>
        ) : (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#EEF2F7] dark:bg-[#101726] neu-inset-sm border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Hanya Super Admin</span>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari kategori atau subkategori..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2.5 bg-[#EEF2F7] dark:bg-[#101726] border border-black/[0.04] dark:border-white/[0.05] rounded-2xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none neu-inset transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1.5 bg-[#EEF2F7] dark:bg-[#101726] rounded-2xl neu-inset-sm border border-black/[0.04] dark:border-white/[0.05] shrink-0 self-start sm:self-auto">
          {(['all', 'active', 'inactive'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all',
                statusFilter === st
                  ? 'neu-pill-active'
                  : 'neu-pill-inactive'
              )}
            >
              {st === 'all' ? 'Semua' : st === 'active' ? 'Aktif' : 'Nonaktif'}
            </button>
          ))}
        </div>
      </div>

      {/* Categories Tree List */}
      <div className="space-y-3">
        {filteredCategories.map((cat) => {
          const subs = subcategoriesByCategory.get(cat.id) || [];
          const isExpanded = expandedCats[cat.id] !== false;

          return (
            <div
              key={cat.id}
              className={cn(
                'bg-[#EEF2F7] dark:bg-[#131C31] rounded-3xl neu-raised border border-black/[0.04] dark:border-white/[0.05] transition-all overflow-hidden',
                !cat.is_active && 'opacity-80'
              )}
            >
              {/* Category Header Row */}
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-black/[0.015] dark:bg-white/[0.015] border-b border-black/[0.04] dark:border-white/[0.05]">
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <button
                    onClick={() => toggleExpand(cat.id)}
                    className="neu-icon-well w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all mt-0.5 sm:mt-0 shrink-0"
                    aria-label="Toggle expand"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight">{cat.name}</span>
                      <span
                        className={cn(
                          'text-[10px] font-bold px-2 py-0.5 rounded-full neu-inset-sm',
                          cat.is_active
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20'
                        )}
                      >
                        {cat.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-xl bg-[#EEF2F7] dark:bg-[#101726] neu-inset-sm border border-black/[0.04] dark:border-white/[0.05] mr-1">
                    {subs.length} Subkategori
                  </span>

                  {isSuperAdmin && (
                    <div className="flex items-center gap-1.5">
                      <MasterDataActionButton
                        variant="add"
                        onClick={() => setCreateSubTargetCat(cat)}
                        title="Tambah Subkategori"
                        aria-label={`Tambah Subkategori di ${cat.name}`}
                      />
                      <MasterDataActionButton
                        variant="edit"
                        onClick={() => setEditCatTarget(cat)}
                        title="Edit Kategori"
                        aria-label={`Edit ${cat.name}`}
                      />
                      <MasterDataActionButton
                        variant={cat.is_active ? 'deactivate' : 'activate'}
                        onClick={() =>
                          setDeactivateTarget({
                            type: 'category',
                            id: cat.id,
                            name: cat.name,
                            currentActive: cat.is_active,
                          })
                        }
                        title={cat.is_active ? 'Nonaktifkan Kategori' : 'Aktifkan Kategori'}
                        aria-label={`${cat.is_active ? 'Nonaktifkan' : 'Aktifkan'} ${cat.name}`}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Subcategories Under this Category */}
              {isExpanded && (
                <div className="p-4 sm:p-5">
                  {subs.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
                      Belum ada subkategori pada kategori ini.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {subs.map((sub) => (
                        <div
                          key={sub.id}
                          className={cn(
                            'p-3 rounded-2xl border border-black/[0.04] dark:border-white/[0.05] neu-raised-sm bg-[#EEF2F7] dark:bg-[#131C31] transition-all flex items-center justify-between gap-2.5',
                            !sub.is_active && 'opacity-70'
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-xl bg-[#EEF2F7] dark:bg-[#101726] neu-inset-sm flex items-center justify-center text-slate-400 dark:text-slate-500 shrink-0">
                              <Tag className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{sub.name}</span>
                            <span
                              className={cn(
                                'w-2 h-2 rounded-full shrink-0',
                                sub.is_active ? 'bg-emerald-500 ring-2 ring-emerald-500/20' : 'bg-slate-400 dark:bg-slate-600'
                              )}
                            />
                          </div>

                          {isSuperAdmin && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <MasterDataActionButton
                                variant="edit"
                                size="sm"
                                onClick={() => setEditSubTarget(sub)}
                                title="Edit Subkategori"
                                aria-label={`Edit ${sub.name}`}
                              />
                              <MasterDataActionButton
                                variant={sub.is_active ? 'deactivate' : 'activate'}
                                size="sm"
                                onClick={() =>
                                  setDeactivateTarget({
                                    type: 'subcategory',
                                    id: sub.id,
                                    name: sub.name,
                                    currentActive: sub.is_active,
                                  })
                                }
                                title={sub.is_active ? 'Nonaktifkan Subkategori' : 'Aktifkan Subkategori'}
                                aria-label={`${sub.is_active ? 'Nonaktifkan' : 'Aktifkan'} ${sub.name}`}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── CREATE CATEGORY MODAL ── */}
      {createCatOpen && (
        <CreateCaseCategoryModalForm
          open={createCatOpen}
          onClose={() => setCreateCatOpen(false)}
          onSuccess={() => {
            setCreateCatOpen(false);
            onRefresh();
          }}
        />
      )}

      {/* ── EDIT CATEGORY MODAL ── */}
      {editCatTarget && (
        <EditCaseCategoryModalForm
          category={editCatTarget}
          open={!!editCatTarget}
          onClose={() => setEditCatTarget(null)}
          onSuccess={() => {
            setEditCatTarget(null);
            onRefresh();
          }}
        />
      )}

      {/* ── CREATE SUBCATEGORY MODAL ── */}
      {createSubTargetCat && (
        <CreateCaseSubcategoryModalForm
          category={createSubTargetCat}
          open={!!createSubTargetCat}
          onClose={() => setCreateSubTargetCat(null)}
          onSuccess={() => {
            setCreateSubTargetCat(null);
            onRefresh();
          }}
        />
      )}

      {/* ── EDIT SUBCATEGORY MODAL ── */}
      {editSubTarget && (
        <EditCaseSubcategoryModalForm
          subcategory={editSubTarget}
          open={!!editSubTarget}
          onClose={() => setEditSubTarget(null)}
          onSuccess={() => {
            setEditSubTarget(null);
            onRefresh();
          }}
        />
      )}

      {/* ── DEACTIVATION CONFIRM MODAL ── */}
      {deactivateTarget && (
        <DeactivationConfirmModal
          open={!!deactivateTarget}
          onClose={() => setDeactivateTarget(null)}
          title={
            deactivateTarget.currentActive
              ? `Nonaktifkan ${deactivateTarget.type === 'category' ? 'Kategori' : 'Subkategori'}`
              : `Aktifkan ${deactivateTarget.type === 'category' ? 'Kategori' : 'Subkategori'}`
          }
          itemName={deactivateTarget.name}
          isDeactivating={deactivateTarget.currentActive}
          onConfirm={async () => {
            if (deactivateTarget.type === 'category') {
              const res = await toggleCaseCategoryActiveAction(deactivateTarget.id, !deactivateTarget.currentActive);
              if (!res.success) throw new Error(res.error);
            } else {
              const res = await toggleCaseSubcategoryActiveAction(deactivateTarget.id, !deactivateTarget.currentActive);
              if (!res.success) throw new Error(res.error);
            }
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL FORMS
// ─────────────────────────────────────────────────────────────────────────────

function CreateCaseCategoryModalForm({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await createCaseCategoryAction({ name });
      if (!res.success) throw new Error(res.error);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Gagal membuat kategori baru.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseModal open={open} onClose={onClose} title="Tambah Kategori Kasus" icon={FolderTree}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-700 dark:text-rose-400 neu-inset-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Nama Kategori <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Contoh: Facility & Building"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[#EEF2F7] dark:bg-[#101726] border border-black/[0.04] dark:border-white/[0.05] rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 fintech-input neu-inset transition-all"
          />
        </div>

        <div className="flex items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl neu-btn-secondary text-xs font-bold text-slate-700 dark:text-slate-300 transition-all touch-target"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 px-4 rounded-xl fintech-btn-primary text-xs font-bold text-white shadow-xs transition-all touch-target flex items-center justify-center"
          >
            {loading ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Simpan Kategori'}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}

function EditCaseCategoryModalForm({
  category,
  open,
  onClose,
  onSuccess,
}: {
  category: CaseCategoryRecord;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(category.name);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await updateCaseCategoryAction({ id: category.id, name });
      if (!res.success) throw new Error(res.error);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Gagal memperbarui kategori.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseModal open={open} onClose={onClose} title="Edit Kategori Kasus" icon={FolderTree}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-700 dark:text-rose-400 neu-inset-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Nama Kategori <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[#EEF2F7] dark:bg-[#101726] border border-black/[0.04] dark:border-white/[0.05] rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 fintech-input neu-inset transition-all"
          />
        </div>

        <div className="flex items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl neu-btn-secondary text-xs font-bold text-slate-700 dark:text-slate-300 transition-all touch-target"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 px-4 rounded-xl fintech-btn-primary text-xs font-bold text-white shadow-xs transition-all touch-target flex items-center justify-center"
          >
            {loading ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Perbarui Kategori'}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}

function CreateCaseSubcategoryModalForm({
  category,
  open,
  onClose,
  onSuccess,
}: {
  category: CaseCategoryRecord;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await createCaseSubcategoryAction({ categoryId: category.id, name });
      if (!res.success) throw new Error(res.error);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Gagal membuat subkategori baru.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title="Tambah Subkategori"
      subtitle={`Kategori: ${category.name}`}
      icon={Tag}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-700 dark:text-rose-400 neu-inset-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Nama Subkategori <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Contoh: Door & Gate"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[#EEF2F7] dark:bg-[#101726] border border-black/[0.04] dark:border-white/[0.05] rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 fintech-input neu-inset transition-all"
          />
        </div>

        <div className="flex items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl neu-btn-secondary text-xs font-bold text-slate-700 dark:text-slate-300 transition-all touch-target"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 px-4 rounded-xl fintech-btn-primary text-xs font-bold text-white shadow-xs transition-all touch-target flex items-center justify-center"
          >
            {loading ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Simpan Subkategori'}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}

function EditCaseSubcategoryModalForm({
  subcategory,
  open,
  onClose,
  onSuccess,
}: {
  subcategory: CaseSubcategoryRecord;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(subcategory.name);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await updateCaseSubcategoryAction({ id: subcategory.id, name });
      if (!res.success) throw new Error(res.error);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Gagal memperbarui subkategori.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseModal open={open} onClose={onClose} title="Edit Subkategori" icon={Tag}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-700 dark:text-rose-400 neu-inset-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Nama Subkategori <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[#EEF2F7] dark:bg-[#101726] border border-black/[0.04] dark:border-white/[0.05] rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 fintech-input neu-inset transition-all"
          />
        </div>

        <div className="flex items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl neu-btn-secondary text-xs font-bold text-slate-700 dark:text-slate-300 transition-all touch-target"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 px-4 rounded-xl fintech-btn-primary text-xs font-bold text-white shadow-xs transition-all touch-target flex items-center justify-center"
          >
            {loading ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Perbarui Subkategori'}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}
