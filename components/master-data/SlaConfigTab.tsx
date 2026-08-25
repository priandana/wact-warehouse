'use client';

// components/master-data/SlaConfigTab.tsx
// SLA Configurations Management: Global Defaults & Active Warehouse Overrides.

import React, { useState } from 'react';
import {
  Clock,
  Globe,
  Building2,
  Edit2,
  Plus,
  Power,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { BaseModal, DeactivationConfirmModal } from './MasterDataModals';
import {
  updateGlobalSlaAction,
  upsertWarehouseSlaOverrideAction,
  toggleSlaActiveAction,
} from '@/app/actions/masterData';

export interface SlaConfigRecord {
  id: string;
  warehouse_id: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  duration_hours: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface SlaConfigTabProps {
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  slaConfigurations: SlaConfigRecord[];
  isSuperAdmin: boolean;
  canManageWarehouse: boolean;
  onRefresh: () => void;
}

const PRIORITY_ORDER = ['critical', 'high', 'medium', 'low'] as const;

const PRIORITY_META: Record<string, { label: string; color: string; badge: string }> = {
  critical: { label: 'Critical', color: 'text-rose-700 bg-rose-50 border-rose-200', badge: 'bg-rose-600' },
  high: { label: 'High', color: 'text-amber-700 bg-amber-50 border-amber-200', badge: 'bg-amber-600' },
  medium: { label: 'Medium', color: 'text-blue-700 bg-blue-50 border-blue-200', badge: 'bg-blue-600' },
  low: { label: 'Low', color: 'text-slate-700 bg-slate-100 border-slate-200', badge: 'bg-slate-500' },
};

export function SlaConfigTab({
  warehouseId,
  warehouseCode,
  warehouseName,
  slaConfigurations,
  isSuperAdmin,
  canManageWarehouse,
  onRefresh,
}: SlaConfigTabProps) {
  // Modals state
  const [editGlobalTarget, setEditGlobalTarget] = useState<SlaConfigRecord | null>(null);
  const [overrideTargetPriority, setOverrideTargetPriority] = useState<{
    priority: 'low' | 'medium' | 'high' | 'critical';
    existingOverride: SlaConfigRecord | null;
    globalHours: number;
  } | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<SlaConfigRecord | null>(null);

  // Group SLAs into Global and Warehouse Overrides
  const globalSlas = slaConfigurations.filter((s) => s.warehouse_id === null);
  const warehouseSlas = slaConfigurations.filter((s) => s.warehouse_id === warehouseId);

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Konfigurasi Target Waktu SLA</h2>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Target penyelesaian kasus berdasarkan tingkat prioritas dan ketentuan operasional
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-extrabold text-xs border border-blue-200/60">
              {warehouseCode} — {warehouseName}
            </span>
          </div>
        </div>

        {/* SLA Resolution Hierarchy Card */}
        <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/70 text-xs text-slate-600 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
            <span>Hirarki Penentuan Deadline Kasus:</span>
          </div>
          <p className="leading-relaxed">
            <strong className="text-slate-800">1. Override Gudang Aktif</strong> (jika diatur) $\to$ <strong className="text-slate-800">2. Default Global</strong> $\to$ <strong className="text-slate-800">3. System Fallback</strong> (1j / 4j / 24j / 72j).
          </p>
          <p className="text-[11px] text-slate-400">
            Perubahan SLA hanya berlaku untuk pelaporan kasus baru dan tidak mengubah due_date kasus yang sedang berjalan.
          </p>
        </div>
      </div>

      {/* SLA Priority Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {PRIORITY_ORDER.map((priority) => {
          const global = globalSlas.find((g) => g.priority === priority);
          const override = warehouseSlas.find((w) => w.priority === priority);
          const meta = PRIORITY_META[priority] || PRIORITY_META.medium;

          const isOverrideActive = override && override.is_active;
          const effectiveHours = isOverrideActive ? override.duration_hours : (global?.duration_hours ?? 24);
          const isOverridden = isOverrideActive;

          return (
            <div
              key={priority}
              className={cn(
                'p-4 bg-white rounded-2xl border transition-all shadow-2xs flex flex-col justify-between gap-3',
                isOverridden ? 'border-blue-200 bg-blue-50/10' : 'border-slate-200/80'
              )}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className={cn('w-2.5 h-2.5 rounded-full', meta.badge)} />
                  <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{meta.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-400">Effective:</span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 text-white font-extrabold text-xs shadow-2xs">
                    {effectiveHours} Jam
                  </span>
                </div>
              </div>

              {/* Rows: Global Default vs Warehouse Override */}
              <div className="space-y-2.5 text-xs">
                {/* Global Row */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
                  <div className="flex items-center gap-2 min-w-0">
                    <Globe className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <div>
                      <p className="font-bold text-slate-800">Default Global</p>
                      <p className="text-[10px] text-slate-400">Berlaku untuk semua gudang</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 text-xs">
                      {global ? `${global.duration_hours} Jam` : '—'}
                    </span>
                    {isSuperAdmin && global && (
                      <button
                        onClick={() => setEditGlobalTarget(global)}
                        className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-all touch-target"
                        title="Edit Default Global"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Warehouse Override Row */}
                <div
                  className={cn(
                    'flex items-center justify-between p-2.5 rounded-xl border transition-all',
                    isOverridden
                      ? 'bg-blue-50/60 border-blue-200/80 text-blue-950'
                      : 'bg-slate-50/60 border-slate-200/60 text-slate-700'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <div>
                      <p className="font-bold text-slate-800">Override {warehouseCode}</p>
                      <p className="text-[10px] text-slate-400">
                        {isOverridden ? 'Aktif khusus gudang ini' : 'Belum diatur (mengikuti global)'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 text-xs">
                      {isOverridden ? `${override.duration_hours} Jam` : 'Mengikuti Global'}
                    </span>

                    {canManageWarehouse && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            setOverrideTargetPriority({
                              priority,
                              existingOverride: override || null,
                              globalHours: global?.duration_hours ?? 24,
                            })
                          }
                          className="p-1 rounded-lg text-blue-600 hover:bg-blue-100/60 border border-blue-200/60 transition-all touch-target"
                          title={override ? 'Edit Override Gudang' : 'Buat Override Khusus Gudang Ini'}
                        >
                          {override ? <Edit2 className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                        </button>

                        {override && (
                          <button
                            onClick={() => setDeactivateTarget(override)}
                            className={cn(
                              'p-1 rounded-lg border transition-all touch-target',
                              override.is_active
                                ? 'text-amber-600 hover:bg-amber-50 border-amber-200/60'
                                : 'text-emerald-600 hover:bg-emerald-50 border-emerald-200/60'
                            )}
                            title={override.is_active ? 'Nonaktifkan Override (Revert ke Global)' : 'Aktifkan Override'}
                          >
                            <Power className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── EDIT GLOBAL SLA MODAL ── */}
      {editGlobalTarget && (
        <EditGlobalSlaModalForm
          sla={editGlobalTarget}
          open={!!editGlobalTarget}
          onClose={() => setEditGlobalTarget(null)}
          onSuccess={() => {
            setEditGlobalTarget(null);
            onRefresh();
          }}
        />
      )}

      {/* ── UPSERT WAREHOUSE OVERRIDE MODAL ── */}
      {overrideTargetPriority && (
        <UpsertWarehouseOverrideModalForm
          warehouseId={warehouseId}
          warehouseCode={warehouseCode}
          priority={overrideTargetPriority.priority}
          existingOverride={overrideTargetPriority.existingOverride}
          globalHours={overrideTargetPriority.globalHours}
          open={!!overrideTargetPriority}
          onClose={() => setOverrideTargetPriority(null)}
          onSuccess={() => {
            setOverrideTargetPriority(null);
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
            deactivateTarget.is_active
              ? `Nonaktifkan Override SLA ${warehouseCode}`
              : `Aktifkan Override SLA ${warehouseCode}`
          }
          itemName={`Prioritas ${deactivateTarget.priority.toUpperCase()} (${deactivateTarget.duration_hours} Jam)`}
          isDeactivating={deactivateTarget.is_active}
          onConfirm={async () => {
            const res = await toggleSlaActiveAction(deactivateTarget.id, !deactivateTarget.is_active);
            if (!res.success) throw new Error(res.error);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

function EditGlobalSlaModalForm({
  sla,
  open,
  onClose,
  onSuccess,
}: {
  sla: SlaConfigRecord;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [durationHours, setDurationHours] = useState<number>(sla.duration_hours);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await updateGlobalSlaAction({ id: sla.id, durationHours });
      if (!res.success) throw new Error(res.error);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Gagal memperbarui SLA Global.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={`Edit SLA Global (${sla.priority.toUpperCase()})`}
      subtitle="Berlaku universal untuk semua gudang tanpa override"
      icon={Globe}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Target Durasi (Jam) <span className="text-rose-500">*</span>
          </label>
          <input
            type="number"
            min={1}
            step={1}
            required
            value={durationHours}
            onChange={(e) => setDurationHours(parseFloat(e.target.value) || 1)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
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
            {loading ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Simpan SLA Global'}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}

function UpsertWarehouseOverrideModalForm({
  warehouseId,
  warehouseCode,
  priority,
  existingOverride,
  globalHours,
  open,
  onClose,
  onSuccess,
}: {
  warehouseId: string;
  warehouseCode: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  existingOverride: SlaConfigRecord | null;
  globalHours: number;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [durationHours, setDurationHours] = useState<number>(
    existingOverride ? existingOverride.duration_hours : globalHours
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await upsertWarehouseSlaOverrideAction({
        warehouseId,
        priority,
        durationHours,
        isActive: true,
      });
      if (!res.success) throw new Error(res.error);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan override SLA gudang.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={`Override SLA ${warehouseCode} (${priority.toUpperCase()})`}
      subtitle={`Default Global: ${globalHours} Jam`}
      icon={Building2}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200/60 text-xs text-blue-900 space-y-1">
          <p className="font-bold">Khusus Gudang {warehouseCode}:</p>
          <p className="text-[11px] leading-relaxed">
            Target SLA ini akan menggantikan Default Global ({globalHours} Jam) khusus untuk kasus baru di gudang ini.
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Target Durasi Override (Jam) <span className="text-rose-500">*</span>
          </label>
          <input
            type="number"
            min={1}
            step={1}
            required
            value={durationHours}
            onChange={(e) => setDurationHours(parseFloat(e.target.value) || 1)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
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
            {loading ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Simpan Override'}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}
