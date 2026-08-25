'use client';
// components/maintenance/MaintenanceListClient.tsx
// Interactive Maintenance Command Center Component in WACT V2 Design Language

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { MaintenanceCard, type MaintenanceItemData } from '@/components/maintenance/MaintenanceCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { SkeletonList } from '@/components/shared/SkeletonCard';
import { Select } from '@/components/shared/Select';
import { getSlaStatus } from '@/lib/utils/sla';
import Link from 'next/link';
import {
  Wrench,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  AlertCircle,
  FolderOpen,
  CheckCircle2,
  Package,
  User,
  LayoutGrid,
  Table as TableIcon,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatDistanceToNow, isPast, differenceInHours, format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface MaintenanceListClientProps {
  initialItems: MaintenanceItemData[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  kpiStats?: {
    openCount: number;
    inProgressCount: number;
    waitingQcCount: number;
    closedCount: number;
    overdueCount: number;
  };
}

const statusFilterTabs = [
  { id: 'all', label: 'Semua Status' },
  { id: 'open', label: 'Perlu Ditangani' },
  { id: 'on_progress', label: 'Dalam Pengerjaan' },
  { id: 'waiting_verification', label: 'Verifikasi QC' },
  { id: 'closed', label: 'Selesai' },
  { id: 'overdue', label: '⚠️ Overdue SLA' },
];

const priorityOptions = [
  { value: 'all', label: 'Semua Prioritas' },
  { value: 'critical', label: 'Kritis (Critical)' },
  { value: 'high', label: 'Tinggi (High)' },
  { value: 'medium', label: 'Sedang (Medium)' },
  { value: 'low', label: 'Rendah (Low)' },
];

export function MaintenanceListClient({
  initialItems,
  totalCount,
  currentPage,
  pageSize,
  kpiStats,
}: MaintenanceListClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentSearch = searchParams.get('q') ?? '';
  const currentStatus = searchParams.get('status') ?? 'all';
  const currentPriority = searchParams.get('priority') ?? 'all';

  const [searchInput, setSearchInput] = useState(currentSearch);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const updateFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    if (!('page' in updates)) {
      params.set('page', '1');
    }

    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === 'all' || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ q: searchInput.trim() || null });
  };

  const handleClearSearch = () => {
    setSearchInput('');
    updateFilters({ q: null });
  };

  return (
    <div className="w-full space-y-5 pb-24 sm:pb-8">
      {/* ── 1. Header Command Area ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-700 shadow-2xs">
              <Wrench className="w-4 h-4 stroke-[2.5]" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Pusat Pemeliharaan & Maintenance
            </h1>
          </div>
          <p className="text-xs sm:text-[13px] text-slate-500 font-semibold mt-1">
            Monitoring perbaikan mesin, log reparasi aset, dan tindak lanjut teknisi PIC
          </p>
        </div>

        {kpiStats && kpiStats.overdueCount > 0 && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-800 text-xs font-bold shadow-2xs self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
            <span>{kpiStats.overdueCount} Perbaikan Melewati Batas SLA</span>
          </div>
        )}
      </div>

      {/* ── 2. KPI Summary Grid (4 High-Clarity Cards) ────────────────────── */}
      {kpiStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* KPI 1: Perlu Ditangani */}
          <button
            type="button"
            onClick={() => updateFilters({ status: 'open' })}
            className={cn(
              'p-3.5 sm:p-4 rounded-2xl border text-left transition-all relative overflow-hidden group shadow-2xs hover:shadow-xs active:scale-[0.99]',
              currentStatus === 'open'
                ? 'bg-blue-50/90 border-blue-400 ring-2 ring-blue-500/20'
                : 'bg-white border-slate-200/80 hover:border-blue-300'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-blue-700">
                Perlu Ditangani
              </span>
              <div className="w-6 h-6 rounded-lg bg-blue-100/80 text-blue-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FolderOpen className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {kpiStats.openCount}
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                Kasus Aktif
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
              Open & Reopened
            </p>
          </button>

          {/* KPI 2: Sedang Dikerjakan */}
          <button
            type="button"
            onClick={() => updateFilters({ status: 'on_progress' })}
            className={cn(
              'p-3.5 sm:p-4 rounded-2xl border text-left transition-all relative overflow-hidden group shadow-2xs hover:shadow-xs active:scale-[0.99]',
              currentStatus === 'on_progress'
                ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-500/20'
                : 'bg-white border-slate-200/80 hover:border-amber-300'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-amber-800">
                Sedang Dikerjakan
              </span>
              <div className="w-6 h-6 rounded-lg bg-amber-100/80 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Wrench className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {kpiStats.inProgressCount}
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                Dalam Proses
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
              Teknisi di Lokasi
            </p>
          </button>

          {/* KPI 3: Menunggu Verifikasi QC */}
          <button
            type="button"
            onClick={() => updateFilters({ status: 'waiting_verification' })}
            className={cn(
              'p-3.5 sm:p-4 rounded-2xl border text-left transition-all relative overflow-hidden group shadow-2xs hover:shadow-xs active:scale-[0.99]',
              currentStatus === 'waiting_verification'
                ? 'bg-purple-50/90 border-purple-400 ring-2 ring-purple-500/20'
                : 'bg-white border-slate-200/80 hover:border-purple-300'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-purple-700">
                Verifikasi QC
              </span>
              <div className="w-6 h-6 rounded-lg bg-purple-100/80 text-purple-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {kpiStats.waitingQcCount}
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                Menunggu Review
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
              Validasi Hasil Reparasi
            </p>
          </button>

          {/* KPI 4: Selesai */}
          <button
            type="button"
            onClick={() => updateFilters({ status: 'closed' })}
            className={cn(
              'p-3.5 sm:p-4 rounded-2xl border text-left transition-all relative overflow-hidden group shadow-2xs hover:shadow-xs active:scale-[0.99]',
              currentStatus === 'closed'
                ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-500/20'
                : 'bg-white border-slate-200/80 hover:border-emerald-300'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-emerald-800">
                Selesai
              </span>
              <div className="w-6 h-6 rounded-lg bg-emerald-100/80 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {kpiStats.closedCount}
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                Terselesaikan
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
              Aset Operasional Normal
            </p>
          </button>
        </div>
      )}

      {/* ── 3. Quick Status Filter Tabs (Scrollable on Mobile) ─────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-slate-200/80">
        {statusFilterTabs.map((tab) => {
          const isActive = currentStatus === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => updateFilters({ status: tab.id })}
              className={cn(
                'px-3 py-2 text-xs font-extrabold whitespace-nowrap rounded-t-xl transition-all border-b-2 -mb-[1px]',
                isActive
                  ? 'border-blue-600 text-blue-700 bg-blue-50/60'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── 4. Search & Controls Filter Bar ───────────────────────────────── */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input Form */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari nomor kasus, nama aset, kode aset, lokasi, teknisi..."
            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-hidden transition-all text-slate-900 placeholder:text-slate-400 font-medium"
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        {/* Priority Filter & View Mode Controls */}
        <div className="flex items-center gap-2">
          <div className="w-44">
            <Select
              value={currentPriority}
              onChange={(val) => updateFilters({ priority: val })}
              options={priorityOptions}
              placeholder="Prioritas"
            />
          </div>

          {/* Desktop View Switcher */}
          <div className="hidden lg:flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={cn(
                'p-1.5 rounded-lg transition-all',
                viewMode === 'table' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              )}
              title="Tampilan Tabel"
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={cn(
                'p-1.5 rounded-lg transition-all',
                viewMode === 'cards' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              )}
              title="Tampilan Kartu"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── 5. Main Content Area (Table / Card Feed) ──────────────────────── */}
      {isPending ? (
        <div className="space-y-3">
          <SkeletonList count={4} />
        </div>
      ) : initialItems.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="Tidak Ada Kasus Maintenance"
          description={
            currentSearch || currentStatus !== 'all' || currentPriority !== 'all'
              ? 'Tidak ada kasus maintenance yang cocok dengan kriteria filter saat ini.'
              : 'Saat ini belum ada kasus atau aset yang memerlukan tindakan maintenance pada gudang ini.'
          }
          action={
            currentSearch || currentStatus !== 'all' || currentPriority !== 'all' ? (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  updateFilters({ q: null, status: null, priority: null });
                }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors"
              >
                Reset Semua Filter
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {/* Mobile Feed (< lg) & Desktop Card View */}
          <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-3.5', viewMode === 'table' ? 'lg:hidden' : 'block')}>
            {initialItems.map((item) => (
              <MaintenanceCard key={item.id} item={item} />
            ))}
          </div>

          {/* Desktop High-Density Table (>= lg) */}
          <div className={cn('hidden rounded-2xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden', viewMode === 'table' ? 'lg:block' : 'hidden')}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">No. Kasus</th>
                    <th className="py-3 px-4">Aset & Lokasi</th>
                    <th className="py-3 px-4">Prioritas</th>
                    <th className="py-3 px-4">Status Perbaikan</th>
                    <th className="py-3 px-4">Teknisi PIC</th>
                    <th className="py-3 px-4">Target SLA</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                  {initialItems.map((item) => {
                    const slaInfo = getSlaStatus(item.due_date, item.status, (item as any).closed_at);
                    const locationText = [item.areas?.name, item.locations?.name].filter(Boolean).join(' • ');

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-blue-50/40 transition-colors group"
                      >
                        {/* No. Kasus & Title */}
                        <td className="py-3 px-4 align-top">
                          <Link href={`/cases/${item.id}`} className="block">
                            <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/60">
                              {item.case_number}
                            </span>
                            <p className="font-extrabold text-slate-900 mt-1 leading-snug group-hover:text-blue-600 transition-colors">
                              {item.title}
                            </p>
                          </Link>
                        </td>

                        {/* Aset & Lokasi */}
                        <td className="py-3 px-4 align-top">
                          {item.assets ? (
                            <div>
                              <span className="font-mono font-bold text-[10.5px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200/60">
                                {item.assets.asset_code}
                              </span>
                              <p className="font-semibold text-slate-800 text-[11.5px] mt-0.5">{item.assets.name}</p>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Non-aset / Fasilitas</span>
                          )}
                          {locationText && (
                            <p className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[150px]">{locationText}</span>
                            </p>
                          )}
                        </td>

                        {/* Prioritas */}
                        <td className="py-3 px-4 align-top">
                          <PriorityBadge priority={item.priority} />
                        </td>

                        {/* Status Perbaikan */}
                        <td className="py-3 px-4 align-top">
                          <StatusBadge status={item.status} />
                        </td>

                        {/* Teknisi PIC */}
                        <td className="py-3 px-4 align-top">
                          {item.assignee?.full_name ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-slate-900 text-white font-black text-[10px] flex items-center justify-center shadow-2xs shrink-0">
                                {item.assignee.full_name[0].toUpperCase()}
                              </div>
                              <span className="font-bold text-slate-800 truncate max-w-[130px]">
                                {item.assignee.full_name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Belum ditugaskan</span>
                          )}
                        </td>

                        {/* Target SLA */}
                        <td className="py-3 px-4 align-top">
                          {slaInfo.type === 'no_sla' ? (
                            <span className="text-slate-400 italic text-[11px]">—</span>
                          ) : slaInfo.isClosed ? (
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full border',
                                slaInfo.badgeBg,
                                slaInfo.badgeText,
                                slaInfo.badgeBorder
                              )}
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>{slaInfo.badgeLabel}</span>
                            </span>
                          ) : slaInfo.isOverdue ? (
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 text-[10.5px] font-extrabold px-2 py-0.5 rounded-full border shadow-2xs',
                                slaInfo.badgeBg,
                                slaInfo.badgeText,
                                slaInfo.badgeBorder
                              )}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                              <span>{slaInfo.badgeLabel}</span>
                            </span>
                          ) : slaInfo.isApproaching ? (
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full border',
                                slaInfo.badgeBg,
                                slaInfo.badgeText,
                                slaInfo.badgeBorder
                              )}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                              <span>{slaInfo.badgeLabel}</span>
                            </span>
                          ) : item.due_date ? (
                            <div>
                              <p className="font-semibold text-slate-800 text-[11px]">
                                {format(new Date(item.due_date), 'dd MMM yyyy, HH:mm', { locale: localeId })}
                              </p>
                              <span className="text-[10px] text-slate-500 font-medium">
                                {slaInfo.badgeLabel}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">—</span>
                          )}
                        </td>

                        {/* Aksi Operasional */}
                        <td className="py-3 px-4 align-top text-right">
                          <Link
                            href={`/cases/${item.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-blue-600 text-white font-extrabold text-xs shadow-2xs transition-colors"
                          >
                            <span>Tangani</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── 6. Pagination Controls ─────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs text-xs">
              <span className="text-slate-500 font-semibold">
                Halaman <strong className="text-slate-800">{currentPage}</strong> dari <strong className="text-slate-800">{totalPages}</strong> ({totalCount} perbaikan)
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => updateFilters({ page: String(currentPage - 1) })}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => updateFilters({ page: String(currentPage + 1) })}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
