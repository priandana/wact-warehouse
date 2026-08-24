'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ClipboardCheck,
  Plus,
  Search,
  Filter,
  Layers,
  ArrowUpDown,
  FileEdit,
  Clock,
  MapPin,
  ChevronRight,
  ShieldCheck,
  Building2,
  Calendar,
  AlertOctagon,
  CheckCircle2,
  Settings,
} from 'lucide-react';
import {
  InspectionStatusBadge,
  OverallResultBadge,
  type InspectionStatus,
  type OverallResult,
} from './InspectionStatusBadge';
import { useActiveWarehouse } from '@/components/shared/layout/AppShellProvider';
import { Select } from '@/components/shared/Select';

export interface InspectionListItem {
  id: string;
  inspection_number: string;
  warehouse_id: string;
  asset_id: string;
  template_id: string;
  status: InspectionStatus;
  overall_result: OverallResult;
  notes?: string | null;
  cancellation_reason?: string | null;
  started_at: string;
  completed_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  inspector?: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
  } | null;
  asset?: {
    id: string;
    asset_code: string;
    name: string;
    category?: { name: string } | null;
    area?: { name: string } | null;
    location?: { name: string } | null;
  } | null;
  template?: {
    id: string;
    name: string;
    category?: { name: string } | null;
  } | null;
  warehouse?: {
    id: string;
    code: string;
    name: string;
  } | null;
}

interface InspectionListContainerProps {
  initialInspections: InspectionListItem[];
  canManageTemplates: boolean;
  warehouses: Array<{ id: string; code: string; name: string }>;
}

export function InspectionListContainer({
  initialInspections,
  canManageTemplates,
  warehouses,
}: InspectionListContainerProps) {
  const router = useRouter();
  const { activeWarehouseId } = useActiveWarehouse();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'completed' | 'cancelled'>('all');
  const [resultFilter, setResultFilter] = useState<'all' | 'ok' | 'ng' | 'na'>('all');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>(activeWarehouseId || 'all');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedWarehouse !== 'all') count++;
    if (statusFilter !== 'all') count++;
    if (resultFilter !== 'all') count++;
    return count;
  }, [selectedWarehouse, statusFilter, resultFilter]);

  const filteredInspections = useMemo(() => {
    return initialInspections.filter((insp) => {
      // Warehouse filter
      if (selectedWarehouse !== 'all' && insp.warehouse_id !== selectedWarehouse) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && insp.status !== statusFilter) {
        return false;
      }

      // Result filter
      if (resultFilter !== 'all' && insp.overall_result !== resultFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const num = insp.inspection_number?.toLowerCase() || '';
        const assetName = insp.asset?.name?.toLowerCase() || '';
        const assetCode = insp.asset?.asset_code?.toLowerCase() || '';
        const tplName = insp.template?.name?.toLowerCase() || '';
        const inspector = insp.inspector?.full_name?.toLowerCase() || '';

        return (
          num.includes(q) ||
          assetName.includes(q) ||
          assetCode.includes(q) ||
          tplName.includes(q) ||
          inspector.includes(q)
        );
      }

      return true;
    });
  }, [initialInspections, selectedWarehouse, statusFilter, resultFilter, searchQuery]);

  const counts = useMemo(() => {
    const total = initialInspections.length;
    const drafts = initialInspections.filter((i) => i.status === 'draft').length;
    const completed = initialInspections.filter((i) => i.status === 'completed').length;
    const cancelled = initialInspections.filter((i) => i.status === 'cancelled').length;
    const ngCount = initialInspections.filter((i) => i.overall_result === 'ng').length;
    return { total, drafts, completed, cancelled, ngCount };
  }, [initialInspections]);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ── 1. Top Action Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              QC & Inspeksi Rutin
            </h1>
            <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200/70 shadow-2xs">
              {filteredInspections.length} Sesi
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Audit berkala kondisi, kebersihan, dan keselamatan operasional aset gudang
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap pt-1 sm:pt-0">
          {canManageTemplates && (
            <Link
              href="/inspections/templates"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors active:scale-95"
            >
              <Settings className="w-4 h-4 text-slate-600" />
              <span>Kelola Template</span>
            </Link>
          )}

          <Link
            href="/inspections/new"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-xs active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Mulai Inspeksi Baru</span>
          </Link>
        </div>
      </div>

      {/* ── 2. Authoritative Overview Metric Cards ──────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
            Total Sesi Inspeksi
          </span>
          <span className="text-xl sm:text-2xl font-black text-slate-900 block tracking-tight">
            {counts.total}
          </span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            <span className="text-[10px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-amber-700">
              Draft Berjalan
            </span>
          </div>
          <span className="text-xl sm:text-2xl font-black text-amber-700 block tracking-tight">
            {counts.drafts}
          </span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-[10px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-emerald-700">
              Selesai Diinspeksi
            </span>
          </div>
          <span className="text-xl sm:text-2xl font-black text-emerald-700 block tracking-tight">
            {counts.completed}
          </span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
            <span className="text-[10px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-rose-700">
              Temuan Defect (NG)
            </span>
          </div>
          <span className="text-xl sm:text-2xl font-black text-rose-700 block tracking-tight">
            {counts.ngCount}
          </span>
        </div>
      </div>

      {/* ── 3. Search & Filter Bar ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs p-3.5 sm:p-4 space-y-3">
        <div className="flex items-center gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nomor inspeksi, kode aset, nama alat, inspector..."
              className="w-full text-xs rounded-xl bg-slate-50 border border-slate-200 pl-9 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium placeholder:text-slate-400"
            />
          </div>

          {/* Warehouse Selector on Desktop */}
          {warehouses.length > 1 && (
            <div className="hidden sm:block w-56">
              <Select
                value={selectedWarehouse}
                onChange={setSelectedWarehouse}
                variant="filter"
                size="sm"
                options={[
                  { value: 'all', label: 'Semua Gudang' },
                  ...warehouses.map((w) => ({
                    value: w.id,
                    label: `${w.code} - ${w.name}`,
                  })),
                ]}
              />
            </div>
          )}

          {/* Mobile Filter Toggle */}
          <button
            type="button"
            onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
            className="sm:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors shrink-0"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter</span>
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Mobile Expandable Filter Panel */}
        {isMobileFilterOpen && (
          <div className="sm:hidden p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
            {warehouses.length > 1 && (
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Gudang</span>
                <Select
                  value={selectedWarehouse}
                  onChange={setSelectedWarehouse}
                  variant="filter"
                  size="sm"
                  options={[
                    { value: 'all', label: 'Semua Gudang' },
                    ...warehouses.map((w) => ({
                      value: w.id,
                      label: `${w.code} - ${w.name}`,
                    })),
                  ]}
                />
              </div>
            )}

            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Status Sesi</span>
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    { key: 'all', label: 'Semua Status' },
                    { key: 'draft', label: 'Draft' },
                    { key: 'completed', label: 'Selesai' },
                    { key: 'cancelled', label: 'Dibatalkan' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setStatusFilter(t.key)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                      statusFilter === t.key
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Hasil Audit</span>
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    { key: 'all', label: 'Semua Hasil' },
                    { key: 'ok', label: 'OK (Lolos)' },
                    { key: 'ng', label: 'NG (Defect)' },
                    { key: 'na', label: 'N/A' },
                  ] as const
                ).map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setResultFilter(r.key)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                      resultFilter === r.key
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Desktop Filter Pills */}
        <div className="hidden sm:flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          {/* Status Tabs */}
          <div className="flex items-center gap-1">
            {(
              [
                { key: 'all', label: 'Semua Status' },
                { key: 'draft', label: 'Draft' },
                { key: 'completed', label: 'Selesai' },
                { key: 'cancelled', label: 'Dibatalkan' },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setStatusFilter(t.key)}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors ${
                  statusFilter === t.key
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Result Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-extrabold uppercase text-slate-400 mr-1">
              Hasil Audit:
            </span>
            {(
              [
                { key: 'all', label: 'Semua' },
                { key: 'ok', label: 'OK' },
                { key: 'ng', label: 'NG' },
                { key: 'na', label: 'N/A' },
              ] as const
            ).map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setResultFilter(r.key)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                  resultFilter === r.key
                    ? 'bg-blue-50 text-blue-700 border border-blue-200/80 font-black'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 4. Inspections List ─────────────────────────────────────────── */}
      <div className="space-y-3">
        {filteredInspections.length === 0 ? (
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-8 sm:p-12 text-center space-y-3">
            <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-sm font-extrabold text-slate-800">
              Tidak Ada Catatan Inspeksi
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              {searchQuery || statusFilter !== 'all' || resultFilter !== 'all'
                ? 'Tidak ada sesi inspeksi yang cocok dengan kriteria pencarian dan filter saat ini.'
                : 'Belum ada audit inspeksi yang tercatat di gudang ini. Mulai audit pertama sekarang.'}
            </p>
            <div className="pt-2">
              <Link
                href="/inspections/new"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-xs active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Mulai Inspeksi Pertama</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredInspections.map((insp) => (
              <Link
                key={insp.id}
                href={`/inspections/${insp.id}`}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-sm hover:border-blue-200/80 transition-all p-3.5 sm:p-5 block group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-2">
                    {/* Badges row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-black text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200/70 shadow-2xs">
                        {insp.inspection_number}
                      </span>
                      <InspectionStatusBadge status={insp.status} size="sm" />
                      {insp.status === 'completed' && (
                        <OverallResultBadge result={insp.overall_result} size="sm" />
                      )}
                    </div>

                    {/* Asset Name & Template */}
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                        {insp.asset?.name || 'Aset Tanpa Nama'}{' '}
                        <span className="font-mono text-xs text-slate-400 font-semibold">
                          ({insp.asset?.asset_code || '-'})
                        </span>
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-0.5 flex-wrap">
                        {insp.template?.name && (
                          <span className="flex items-center gap-1 text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px] font-semibold">
                            <Layers className="w-3 h-3 text-slate-500" />
                            <span>{insp.template.name}</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-[11.5px]">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {insp.warehouse?.code || 'Gudang'} &bull; {insp.asset?.area?.name || 'Area'}
                            {insp.asset?.location?.name ? ` • ${insp.asset.location.name}` : ''}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Metadata & Inspector */}
                    <div className="flex items-center gap-2.5 text-[11px] text-slate-400 font-medium flex-wrap pt-0.5">
                      <span>
                        Inspector: <strong className="text-slate-700">{insp.inspector?.full_name || 'Petugas'}</strong>
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>
                          {new Date(insp.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Right Action Button */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0">
                    {insp.status === 'draft' ? (
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 text-white font-extrabold text-xs shadow-xs group-hover:bg-amber-600 transition-colors">
                        <FileEdit className="w-3.5 h-3.5" />
                        <span>Lanjutkan Inspeksi</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors">
                        <span>Lihat Audit</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
