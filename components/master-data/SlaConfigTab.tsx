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
import { MasterDataActionButton } from './MasterDataActionButton';
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
      <div className="p-5 bg-[#EEF2F7] dark:bg-[#131C31] rounded-3xl neu-raised border border-black/[0.04] dark:border-white/[0.05] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#EEF2F7] dark:bg-[#101726] neu-inset-sm text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-500/20">
                <Clock className="w-4 h-4" />
              </div>
              <h2 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight">Konfigurasi Target Waktu SLA</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Target penyelesaian kasus berdasarkan tingkat prioritas dan ketentuan operasional
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-[#EEF2F7] dark:bg-[#101726] neu-inset-sm text-blue-700 dark:text-blue-400 font-extrabold text-xs border border-blue-500/20">
              {warehouseCode} — {warehouseName}
            </span>
          </div>
        </div>

        {/* SLA Resolution Hierarchy Card */}
        <div className="p-4 bg-[#EEF2F7] dark:bg-[#101726] rounded-2xl neu-inset-sm border border-black/[0.04] dark:border-white/[0.05] text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
            <HelpCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Hirarki Penentuan Deadline Kasus:</span>
          </div>
          <p className="leading-relaxed">
            <strong className="text-slate-800 dark:text-slate-200">1. Override Gudang Aktif</strong> (jika diatur) → <strong className="text-slate-800 dark:text-slate-200">2. Default Global</strong> → <strong className="text-slate-800 dark:text-slate-200">3. System Fallback</strong> (1j / 4j / 24j / 72j).
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Perubahan SLA hanya berlaku untuk pelaporan kasus baru dan tidak mengubah due_date kasus yang sedang berjalan.
          </p>
        </div>
      </div>

      {/* SLA Priority Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
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
                'p-5 bg-[#EEF2F7] dark:bg-[#131C31] rounded-3xl neu-raised border border-black/[0.04] dark:border-white/[0.05] transition-all flex flex-col justify-between gap-4',
                isOverridden && 'ring-1 ring-blue-500/30'
              )}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-black/[0.04] dark:border-white/[0.05]">
                <div className="flex items-center gap-2.5">
                  <span className={cn('w-2.5 h-2.5 rounded-full ring-2 ring-black/5 dark:ring-white/10', meta.badge)} />
                  <span className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">{meta.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Effective:</span>
                  <span className="px-3 py-1 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-black text-xs shadow-xs">
                    {effectiveHours} Jam
                  </span>
                </div>
              </div>

              {/* Rows: Global Default vs Warehouse Override */}
              <div className="space-y-2.5 text-xs">
                {/* Global Row */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#EEF2F7] dark:bg-[#101726] neu-inset-sm border border-black/[0.04] dark:border-white/[0.05] min-h-[56px] gap-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 dark:text-slate-200 leading-tight">Default Global</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight truncate">Berlaku untuk semua gudang</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-black text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                      {global ? `${global.duration_hours} Jam` : '—'}
                    </span>
                    {isSuperAdmin && global ? (
                      <MasterDataActionButton
                        variant="edit"
                        onClick={() => setEditGlobalTarget(global)}
                        title={`Edit Default Global SLA (${meta.label})`}
                        aria-label={`Edit Default Global SLA (${meta.label})`}
                      />
                    ) : (
                      <div className="w-11 sm:w-10 shrink-0" />
                    )}
                  </div>
                </div>

                {/* Warehouse Override Row */}
                <div
                  className={cn(
                    'flex items-center justify-between p-3.5 rounded-2xl border transition-all min-h-[56px] gap-2.5 neu-inset-sm',
                    isOverridden
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-950 dark:text-blue-200'
                      : 'bg-[#EEF2F7] dark:bg-[#101726] border-black/[0.04] dark:border-white/[0.05] text-slate-700 dark:text-slate-300'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 dark:text-slate-200 leading-tight">Override {warehouseCode}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                        {isOverridden ? 'Aktif khusus gudang ini' : 'Belum diatur (mengikuti global)'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={cn(
                        'text-xs sm:text-sm',
                        isOverridden ? 'text-blue-900 dark:text-blue-300 font-black' : 'text-slate-500 dark:text-slate-400 font-semibold'
                      )}
                    >
                      {isOverridden ? `${override.duration_hours} Jam` : 'Mengikuti Global'}
                    </span>

                    {canManageWarehouse && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <MasterDataActionButton
                          variant={override ? 'edit' : 'add'}
                          onClick={() =>
                            setOverrideTargetPriority({
                              priority,
                              existingOverride: override || null,
                              globalHours: global?.duration_hours ?? 24,
                            })
                          }
                          title={override ? `Edit Override Gudang (${meta.label})` : `Buat Override Khusus Gudang Ini (${meta.label})`}
                          aria-label={override ? `Edit Override Gudang (${meta.label})` : `Buat Override Khusus Gudang Ini (${meta.label})`}
                        />

                        {override && (
                          <MasterDataActionButton
                            variant={override.is_active ? 'deactivate' : 'activate'}
                            onClick={() => setDeactivateTarget(override)}
                            title={override.is_active ? 'Nonaktifkan Override (Revert ke Global)' : 'Aktifkan Override'}
                            aria-label={override.is_active ? 'Nonaktifkan Override' : 'Aktifkan Override'}
                          />
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
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-700 dark:text-rose-400 neu-inset-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Target Durasi (Jam) <span className="text-rose-500">*</span>
          </label>
          <input
            type="number"
            min={1}
            step={1}
            required
            value={durationHours}
            onChange={(e) => setDurationHours(parseFloat(e.target.value) || 1)}
            className="w-full px-3.5 py-2.5 bg-[#EEF2F7] dark:bg-[#101726] border border-black/[0.04] dark:border-white/[0.05] rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 fintech-input neu-inset transition-all"
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
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-700 dark:text-rose-400 neu-inset-sm">
            {error}
          </div>
        )}

        <div className="p-3.5 bg-[#EEF2F7] dark:bg-[#101726] rounded-xl neu-inset-sm border border-blue-500/20 text-xs text-blue-900 dark:text-blue-300 space-y-1">
          <p className="font-bold">Khusus Gudang {warehouseCode}:</p>
          <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
            Target SLA ini akan menggantikan Default Global ({globalHours} Jam) khusus untuk kasus baru di gudang ini.
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Target Durasi Override (Jam) <span className="text-rose-500">*</span>
          </label>
          <input
            type="number"
            min={1}
            step={1}
            required
            value={durationHours}
            onChange={(e) => setDurationHours(parseFloat(e.target.value) || 1)}
            className="w-full px-3.5 py-2.5 bg-[#EEF2F7] dark:bg-[#101726] border border-black/[0.04] dark:border-white/[0.05] rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 fintech-input neu-inset transition-all"
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
            {loading ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Simpan Override'}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}
