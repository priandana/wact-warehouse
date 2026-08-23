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
    <div className="page-padding py-5 max-w-6xl mx-auto space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              QC & Inspeksi Rutin
            </h1>
            <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
              {filteredInspections.length} Total
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Audit berkala kondisi, kebersihan, dan keselamatan operasional aset gudang
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManageTemplates && (
            <Link
              href="/inspections/templates"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Kelola Template</span>
            </Link>
          )}

          <Link
            href="/inspections/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-sm shadow-blue-500/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Mulai Inspeksi Baru</span>
          </Link>
        </div>
      </div>

      {/* 4 Summary Stat Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="block text-[10px] font-extrabold uppercase text-slate-400">
            Total Inspeksi
          </span>
          <span className="text-xl font-black text-slate-900 mt-0.5 block">
            {counts.total}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="block text-[10px] font-extrabold uppercase text-amber-500">
            Draft Berjalan
          </span>
          <span className="text-xl font-black text-amber-600 mt-0.5 block">
            {counts.drafts}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="block text-[10px] font-extrabold uppercase text-emerald-500">
            Selesai Diinspeksi
          </span>
          <span className="text-xl font-black text-emerald-600 mt-0.5 block">
            {counts.completed}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="block text-[10px] font-extrabold uppercase text-rose-500">
            Temuan Defect (NG)
          </span>
          <span className="text-xl font-black text-rose-600 mt-0.5 block">
            {counts.ngCount}
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
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

          {/* Warehouse Selector */}
          {warehouses.length > 1 && (
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="text-xs rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">Semua Gudang</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code} - {w.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto">
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
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors whitespace-nowrap ${
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
              Hasil:
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
                className={`px-2.5 py-0.5 rounded-md font-bold text-[11px] transition-colors ${
                  resultFilter === r.key
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Inspections List */}
      <div className="space-y-3">
        {filteredInspections.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-3">
            <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-sm font-extrabold text-slate-800">
              Tidak Ada Catatan Inspeksi
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              {searchQuery || statusFilter !== 'all' || resultFilter !== 'all'
                ? 'Tidak ada inspeksi yang cocok dengan kriteria pencarian dan filter saat ini.'
                : 'Belum ada audit inspeksi yang tercatat di gudang ini. Mulai audit pertama sekarang.'}
            </p>
            <div className="pt-2">
              <Link
                href="/inspections/new"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
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
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-sm hover:border-blue-200/80 transition-all p-4 sm:p-5 block group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1.5">
                    {/* Badges row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                        {insp.inspection_number}
                      </span>
                      <InspectionStatusBadge status={insp.status} size="sm" />
                      {insp.status === 'completed' && (
                        <OverallResultBadge result={insp.overall_result} size="sm" />
                      )}
                    </div>

                    {/* Asset Name & Template */}
                    <div>
                      <h3 className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                        {insp.asset?.name || 'Aset Tanpa Nama'}{' '}
                        <span className="font-mono text-xs text-slate-400 font-semibold">
                          ({insp.asset?.asset_code || '-'})
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Template: <span className="font-bold text-slate-700">{insp.template?.name || 'Inspeksi QC'}</span>
                      </p>
                    </div>

                    {/* Metadata & Inspector */}
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium flex-wrap pt-1">
                      <span className="flex items-center gap-1 text-slate-600">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>
                          {insp.warehouse?.code || 'Gudang'} &bull; {insp.asset?.area?.name || 'Area'}
                        </span>
                      </span>
                      <span>&bull;</span>
                      <span>
                        Inspector: <strong className="text-slate-700">{insp.inspector?.full_name || 'Petugas'}</strong>
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
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

                  {/* Right Action Pill */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {insp.status === 'draft' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-white font-extrabold text-xs shadow-xs group-hover:bg-amber-600 transition-colors">
                        <FileEdit className="w-3.5 h-3.5" />
                        <span>Lanjutkan Draft</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors">
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
