'use client';

// components/master-data/AreasLocationsTab.tsx
// Warehouse-scoped Master Data Management for Areas and Locations.
// Displays active warehouse context, search/filtering, hierarchical cards, and guarded CRUD modals.

import React, { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  Layers,
  MapPin,
  Edit2,
  Power,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { BaseModal, DeactivationConfirmModal } from './MasterDataModals';
import { MasterDataActionButton } from './MasterDataActionButton';
import {
  createAreaAction,
  updateAreaAction,
  toggleAreaActiveAction,
  createLocationAction,
  updateLocationAction,
  toggleLocationActiveAction,
} from '@/app/actions/masterData';

export interface AreaRecord {
  id: string;
  warehouse_id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface LocationRecord {
  id: string;
  area_id: string;
  warehouse_id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

interface AreasLocationsTabProps {
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  areas: AreaRecord[];
  locations: LocationRecord[];
  canManage: boolean;
  onRefresh: () => void;
}

export function AreasLocationsTab({
  warehouseId,
  warehouseCode,
  warehouseName,
  areas,
  locations,
  canManage,
  onRefresh,
}: AreasLocationsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [expandedAreas, setExpandedAreas] = useState<Record<string, boolean>>({});

  // Modals state
  const [createAreaOpen, setCreateAreaOpen] = useState(false);
  const [editAreaTarget, setEditAreaTarget] = useState<AreaRecord | null>(null);
  const [createLocationTargetArea, setCreateLocationTargetArea] = useState<AreaRecord | null>(null);
  const [editLocationTarget, setEditLocationTarget] = useState<LocationRecord | null>(null);

  // Deactivate modal state
  const [deactivateTarget, setDeactivateTarget] = useState<{
    type: 'area' | 'location';
    id: string;
    name: string;
    currentActive: boolean;
  } | null>(null);

  // Toggle area expansion
  const toggleExpand = (areaId: string) => {
    setExpandedAreas((prev) => ({ ...prev, [areaId]: !prev[areaId] }));
  };

  // Group locations by area_id
  const locationsByArea = useMemo(() => {
    const map = new Map<string, LocationRecord[]>();
    for (const loc of locations) {
      if (!map.has(loc.area_id)) map.set(loc.area_id, []);
      map.get(loc.area_id)!.push(loc);
    }
    return map;
  }, [locations]);

  // Filtered areas and locations
  const filteredAreas = useMemo(() => {
    return areas.filter((area) => {
      // Status filter
      if (statusFilter === 'active' && !area.is_active) return false;
      if (statusFilter === 'inactive' && area.is_active) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchArea = area.code.toLowerCase().includes(q) || area.name.toLowerCase().includes(q);
        const areaLocs = locationsByArea.get(area.id) || [];
        const matchLoc = areaLocs.some((l) => l.code.toLowerCase().includes(q) || l.name.toLowerCase().includes(q));
        return matchArea || matchLoc;
      }
      return true;
    });
  }, [areas, statusFilter, searchQuery, locationsByArea]);

  const activeAreasCount = areas.filter((a) => a.is_active).length;
  const activeLocationsCount = locations.filter((l) => l.is_active).length;

  return (
    <div className="space-y-4">
      {/* Tab Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-extrabold text-[11px] border border-blue-200/60">
              {warehouseCode}
            </span>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Area & Lokasi Operasional</h2>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {activeAreasCount} Area Aktif • {activeLocationsCount} Lokasi Terdaftar di {warehouseName}
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCreateAreaOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-xs transition-all touch-target"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Tambah Area</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari kode atau nama area/lokasi..."
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
                statusFilter === st
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              {st === 'all' ? 'Semua' : st === 'active' ? 'Aktif' : 'Nonaktif'}
            </button>
          ))}
        </div>
      </div>

      {/* Areas List */}
      {filteredAreas.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80 space-y-2">
          <Building2 className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900">Tidak ada area yang cocok</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Coba ubah kata kunci pencarian atau filter status untuk menemukan area operasional.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAreas.map((area) => {
            const areaLocs = locationsByArea.get(area.id) || [];
            const isExpanded = expandedAreas[area.id] !== false; // Default expanded

            return (
              <div
                key={area.id}
                className={cn(
                  'bg-white rounded-2xl border transition-all shadow-2xs overflow-hidden',
                  area.is_active ? 'border-slate-200/80' : 'border-slate-200 bg-slate-50/50 opacity-80'
                )}
              >
                {/* Area Header Row */}
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60 border-b border-slate-100">
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <button
                      onClick={() => toggleExpand(area.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all mt-0.5 sm:mt-0"
                      aria-label="Toggle expand"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-black text-slate-900 px-2 py-0.5 rounded-md bg-white border border-slate-200 shadow-2xs">
                          {area.code}
                        </span>
                        <span className="text-sm font-extrabold text-slate-900 tracking-tight truncate">
                          {area.name}
                        </span>
                        <span
                          className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full',
                            area.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          )}
                        >
                          {area.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </div>
                      {area.description && (
                        <p className="text-xs text-slate-500 font-medium truncate">{area.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Area Actions */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                    <span className="text-xs font-semibold text-slate-500 px-2.5 py-1 bg-white rounded-lg border border-slate-200/60 shadow-2xs mr-1">
                      {areaLocs.length} Lokasi
                    </span>

                    {canManage && (
                      <div className="flex items-center gap-1.5">
                        <MasterDataActionButton
                          variant="add"
                          onClick={() => setCreateLocationTargetArea(area)}
                          title="Tambah Lokasi di Area ini"
                          aria-label={`Tambah Lokasi di ${area.name}`}
                        />
                        <MasterDataActionButton
                          variant="edit"
                          onClick={() => setEditAreaTarget(area)}
                          title="Edit Area"
                          aria-label={`Edit ${area.name}`}
                        />
                        <MasterDataActionButton
                          variant={area.is_active ? 'deactivate' : 'activate'}
                          onClick={() =>
                            setDeactivateTarget({
                              type: 'area',
                              id: area.id,
                              name: `${area.code} — ${area.name}`,
                              currentActive: area.is_active,
                            })
                          }
                          title={area.is_active ? 'Nonaktifkan Area' : 'Aktifkan Area'}
                          aria-label={`${area.is_active ? 'Nonaktifkan' : 'Aktifkan'} ${area.name}`}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Locations Under this Area */}
                {isExpanded && (
                  <div className="p-3 sm:p-4">
                    {areaLocs.length === 0 ? (
                      <div className="py-4 text-center text-xs text-slate-400 font-medium">
                        Belum ada lokasi yang didaftarkan di area ini.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {areaLocs.map((loc) => (
                          <div
                            key={loc.id}
                            className={cn(
                              'p-3 rounded-xl border transition-all flex items-start justify-between gap-2 shadow-2xs',
                              loc.is_active
                                ? 'bg-white border-slate-200/80 hover:border-slate-300'
                                : 'bg-slate-50 border-slate-200/50 opacity-70'
                            )}
                          >
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50/80 px-1.5 py-0.5 rounded border border-blue-200/50">
                                  {loc.code}
                                </span>
                                <span
                                  className={cn(
                                    'w-1.5 h-1.5 rounded-full shrink-0',
                                    loc.is_active ? 'bg-emerald-500 ring-2 ring-emerald-100' : 'bg-slate-300'
                                  )}
                                />
                              </div>
                              <p className="text-xs font-bold text-slate-900 tracking-tight truncate">
                                {loc.name}
                              </p>
                              {loc.description && (
                                <p className="text-[11px] text-slate-400 truncate">{loc.description}</p>
                              )}
                            </div>

                            {canManage && (
                              <div className="flex items-center gap-1 shrink-0">
                                <MasterDataActionButton
                                  variant="edit"
                                  size="sm"
                                  onClick={() => setEditLocationTarget(loc)}
                                  title="Edit Lokasi"
                                  aria-label={`Edit ${loc.name}`}
                                />
                                <MasterDataActionButton
                                  variant={loc.is_active ? 'deactivate' : 'activate'}
                                  size="sm"
                                  onClick={() =>
                                    setDeactivateTarget({
                                      type: 'location',
                                      id: loc.id,
                                      name: `${loc.code} — ${loc.name}`,
                                      currentActive: loc.is_active,
                                    })
                                  }
                                  title={loc.is_active ? 'Nonaktifkan Lokasi' : 'Aktifkan Lokasi'}
                                  aria-label={`${loc.is_active ? 'Nonaktifkan' : 'Aktifkan'} ${loc.name}`}
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
      )}

      {/* ── CREATE AREA MODAL ── */}
      {createAreaOpen && (
        <CreateAreaModalForm
          warehouseId={warehouseId}
          open={createAreaOpen}
          onClose={() => setCreateAreaOpen(false)}
          onSuccess={() => {
            setCreateAreaOpen(false);
            onRefresh();
          }}
        />
      )}

      {/* ── EDIT AREA MODAL ── */}
      {editAreaTarget && (
        <EditAreaModalForm
          area={editAreaTarget}
          open={!!editAreaTarget}
          onClose={() => setEditAreaTarget(null)}
          onSuccess={() => {
            setEditAreaTarget(null);
            onRefresh();
          }}
        />
      )}

      {/* ── CREATE LOCATION MODAL ── */}
      {createLocationTargetArea && (
        <CreateLocationModalForm
          warehouseId={warehouseId}
          area={createLocationTargetArea}
          open={!!createLocationTargetArea}
          onClose={() => setCreateLocationTargetArea(null)}
          onSuccess={() => {
            setCreateLocationTargetArea(null);
            onRefresh();
          }}
        />
      )}

      {/* ── EDIT LOCATION MODAL ── */}
      {editLocationTarget && (
        <EditLocationModalForm
          location={editLocationTarget}
          open={!!editLocationTarget}
          onClose={() => setEditLocationTarget(null)}
          onSuccess={() => {
            setEditLocationTarget(null);
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
              ? `Nonaktifkan ${deactivateTarget.type === 'area' ? 'Area' : 'Lokasi'}`
              : `Aktifkan ${deactivateTarget.type === 'area' ? 'Area' : 'Lokasi'}`
          }
          itemName={deactivateTarget.name}
          isDeactivating={deactivateTarget.currentActive}
          onConfirm={async () => {
            if (deactivateTarget.type === 'area') {
              const res = await toggleAreaActiveAction(deactivateTarget.id, !deactivateTarget.currentActive);
              if (!res.success) throw new Error(res.error);
            } else {
              const res = await toggleLocationActiveAction(deactivateTarget.id, !deactivateTarget.currentActive);
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

function CreateAreaModalForm({
  warehouseId,
  open,
  onClose,
  onSuccess,
}: {
  warehouseId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await createAreaAction({ warehouseId, code, name, description });
      if (!res.success) throw new Error(res.error);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan area baru.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseModal open={open} onClose={onClose} title="Tambah Area Baru" icon={Building2}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Kode Area <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Contoh: STORAGE_CHILLER"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all uppercase"
          />
          <p className="text-[11px] text-slate-400 mt-1">Gunakan huruf kapital dan garis bawah (A-Z, 0-9, _).</p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Nama Area <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Contoh: Storage Chiller"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi (Opsional)</label>
          <textarea
            rows={2}
            placeholder="Keterangan fungsi atau zona area..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
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
            {loading ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Simpan Area'}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}

function EditAreaModalForm({
  area,
  open,
  onClose,
  onSuccess,
}: {
  area: AreaRecord;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(area.name);
  const [description, setDescription] = useState(area.description || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await updateAreaAction({ id: area.id, name, description });
      if (!res.success) throw new Error(res.error);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Gagal memperbarui area.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseModal open={open} onClose={onClose} title={`Edit Area: ${area.code}`} icon={Building2}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Kode Area</label>
          <input
            type="text"
            disabled
            value={area.code}
            className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-500 cursor-not-allowed"
          />
          <p className="text-[11px] text-slate-400 mt-1">Kode area terikat dengan integritas referensi dan tidak dapat diubah.</p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Nama Area <span className="text-rose-500">*</span>
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
          <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
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
            {loading ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Perbarui Area'}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}

function CreateLocationModalForm({
  warehouseId,
  area,
  open,
  onClose,
  onSuccess,
}: {
  warehouseId: string;
  area: AreaRecord;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await createLocationAction({
        warehouseId,
        areaId: area.id,
        code,
        name,
        description,
      });
      if (!res.success) throw new Error(res.error);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan lokasi baru.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseModal open={open} onClose={onClose} title="Tambah Lokasi Baru" subtitle={`Area: ${area.name}`} icon={MapPin}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Kode Lokasi <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Contoh: CHILLER_ZONE_A"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all uppercase"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Nama Lokasi <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Contoh: Chiller Zone A"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi</label>
          <textarea
            rows={2}
            placeholder="Keterangan spesifik letak rak / lorong..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
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
            {loading ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Simpan Lokasi'}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}

function EditLocationModalForm({
  location,
  open,
  onClose,
  onSuccess,
}: {
  location: LocationRecord;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(location.name);
  const [description, setDescription] = useState(location.description || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await updateLocationAction({ id: location.id, name, description });
      if (!res.success) throw new Error(res.error);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Gagal memperbarui lokasi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseModal open={open} onClose={onClose} title={`Edit Lokasi: ${location.code}`} icon={MapPin}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Kode Lokasi</label>
          <input
            type="text"
            disabled
            value={location.code}
            className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-500 cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Nama Lokasi <span className="text-rose-500">*</span>
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
          <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
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
            {loading ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Perbarui Lokasi'}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}
