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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-extrabold text-[11px] border border-purple-200/60">
              <Globe className="w-3 h-3" />
              <span>Global</span>
            </span>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Kategori & Subkategori Kasus</h2>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Taksonomi pelaporan kerusakan berlaku universal untuk semua gudang
          </p>
        </div>

        {isSuperAdmin ? (
          <button
            onClick={() => setCreateCatOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-xs transition-all touch-target"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Tambah Kategori</span>
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
            placeholder="Cari kategori atau subkategori..."
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

      {/* Categories Tree List */}
      <div className="space-y-3">
        {filteredCategories.map((cat) => {
          const subs = subcategoriesByCategory.get(cat.id) || [];
          const isExpanded = expandedCats[cat.id] !== false;

          return (
            <div
              key={cat.id}
              className={cn(
                'bg-white rounded-2xl border transition-all shadow-2xs overflow-hidden',
                cat.is_active ? 'border-slate-200/80' : 'border-slate-200 bg-slate-50/50 opacity-80'
              )}
            >
              {/* Category Header Row */}
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60 border-b border-slate-100">
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <button
                    onClick={() => toggleExpand(cat.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all mt-0.5 sm:mt-0"
                    aria-label="Toggle expand"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-extrabold text-slate-900 tracking-tight">{cat.name}</span>
                      <span
                        className={cn(
                          'text-[10px] font-bold px-2 py-0.5 rounded-full',
                          cat.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        )}
                      >
                        {cat.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                  <span className="text-xs font-semibold text-slate-500 px-2 py-1 bg-white rounded-lg border border-slate-200/60 shadow-2xs mr-1">
                    {subs.length} Subkategori
                  </span>

                  {isSuperAdmin && (
                    <>
                      <button
                        onClick={() => setCreateSubTargetCat(cat)}
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 border border-blue-200/60 transition-all touch-target"
                        title="Tambah Subkategori"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditCatTarget(cat)}
                        className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200 transition-all touch-target"
                        title="Edit Kategori"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() =>
                          setDeactivateTarget({
                            type: 'category',
                            id: cat.id,
                            name: cat.name,
                            currentActive: cat.is_active,
                          })
                        }
                        className={cn(
                          'p-1.5 rounded-lg border transition-all touch-target',
                          cat.is_active
                            ? 'text-amber-600 hover:bg-amber-50 border-amber-200/60'
                            : 'text-emerald-600 hover:bg-emerald-50 border-emerald-200/60'
                        )}
                        title={cat.is_active ? 'Nonaktifkan Kategori' : 'Aktifkan Kategori'}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Subcategories Under this Category */}
              {isExpanded && (
                <div className="p-3 sm:p-4">
                  {subs.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-400 font-medium">
                      Belum ada subkategori pada kategori ini.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {subs.map((sub) => (
                        <div
                          key={sub.id}
                          className={cn(
                            'p-2.5 px-3 rounded-xl border transition-all flex items-center justify-between gap-2 shadow-2xs',
                            sub.is_active
                              ? 'bg-white border-slate-200/80 hover:border-slate-300'
                              : 'bg-slate-50 border-slate-200/50 opacity-70'
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-xs font-bold text-slate-800 truncate">{sub.name}</span>
                            <span
                              className={cn(
                                'w-1.5 h-1.5 rounded-full shrink-0',
                                sub.is_active ? 'bg-emerald-500' : 'bg-slate-300'
                              )}
                            />
                          </div>

                          {isSuperAdmin && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => setEditSubTarget(sub)}
                                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all touch-target"
                                title="Edit Subkategori"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() =>
                                  setDeactivateTarget({
                                    type: 'subcategory',
                                    id: sub.id,
                                    name: sub.name,
                                    currentActive: sub.is_active,
                                  })
                                }
                                className={cn(
                                  'p-1 rounded transition-all touch-target',
                                  sub.is_active
                                    ? 'text-amber-500 hover:text-amber-700 hover:bg-amber-50'
                                    : 'text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50'
                                )}
                                title={sub.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                              >
                                <Power className="w-3 h-3" />
                              </button>
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
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Nama Kategori <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Contoh: Facility & Building"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Nama Kategori <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
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
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Nama Subkategori <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Contoh: Door & Gate"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Nama Subkategori <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
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
            {loading ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Perbarui Subkategori'}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}
