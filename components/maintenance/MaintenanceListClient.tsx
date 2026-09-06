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
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl neu-icon-well flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Wrench className="w-4 h-4 stroke-[2.5]" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
              Pusat Pemeliharaan & Maintenance
            </h1>
          </div>
          <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 font-semibold mt-1">
            Monitoring perbaikan mesin, log reparasi aset, dan tindak lanjut teknisi PIC
          </p>
        </div>

        {kpiStats && kpiStats.overdueCount > 0 && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl neu-inset-sm bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold self-start sm:self-auto">
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
              'p-3.5 sm:p-4 rounded-3xl border text-left transition-all relative overflow-hidden group active:scale-[0.99]',
              currentStatus === 'open'
                ? 'bg-[#EEF2F7] dark:bg-[#131C31] neu-inset-sm ring-2 ring-blue-500/30 border-blue-500/40'
                : 'bg-[#EEF2F7] dark:bg-[#131C31] neu-raised neu-card-interactive border-black/[0.04] dark:border-white/[0.05]'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Perlu Ditangani
              </span>
              <div className="w-8 h-8 rounded-xl neu-icon-well flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                <FolderOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                {kpiStats.openCount}
              </span>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Kasus Aktif
              </span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
              Open & Reopened
            </p>
          </button>

          {/* KPI 2: Sedang Dikerjakan */}
          <button
            type="button"
            onClick={() => updateFilters({ status: 'on_progress' })}
            className={cn(
              'p-3.5 sm:p-4 rounded-3xl border text-left transition-all relative overflow-hidden group active:scale-[0.99]',
              currentStatus === 'on_progress'
                ? 'bg-[#EEF2F7] dark:bg-[#131C31] neu-inset-sm ring-2 ring-amber-500/30 border-amber-500/40'
                : 'bg-[#EEF2F7] dark:bg-[#131C31] neu-raised neu-card-interactive border-black/[0.04] dark:border-white/[0.05]'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Sedang Dikerjakan
              </span>
              <div className="w-8 h-8 rounded-xl neu-icon-well flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                <Wrench className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                {kpiStats.inProgressCount}
              </span>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Dalam Proses
              </span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
              Teknisi di Lokasi
            </p>
          </button>

          {/* KPI 3: Menunggu Verifikasi QC */}
          <button
            type="button"
            onClick={() => updateFilters({ status: 'waiting_verification' })}
            className={cn(
              'p-3.5 sm:p-4 rounded-3xl border text-left transition-all relative overflow-hidden group active:scale-[0.99]',
              currentStatus === 'waiting_verification'
                ? 'bg-[#EEF2F7] dark:bg-[#131C31] neu-inset-sm ring-2 ring-purple-500/30 border-purple-500/40'
                : 'bg-[#EEF2F7] dark:bg-[#131C31] neu-raised neu-card-interactive border-black/[0.04] dark:border-white/[0.05]'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                Verifikasi QC
              </span>
              <div className="w-8 h-8 rounded-xl neu-icon-well flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                {kpiStats.waitingQcCount}
              </span>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Menunggu Review
              </span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
              Validasi Hasil Reparasi
            </p>
          </button>

          {/* KPI 4: Selesai */}
          <button
            type="button"
            onClick={() => updateFilters({ status: 'closed' })}
            className={cn(
              'p-3.5 sm:p-4 rounded-3xl border text-left transition-all relative overflow-hidden group active:scale-[0.99]',
              currentStatus === 'closed'
                ? 'bg-[#EEF2F7] dark:bg-[#131C31] neu-inset-sm ring-2 ring-emerald-500/30 border-emerald-500/40'
                : 'bg-[#EEF2F7] dark:bg-[#131C31] neu-raised neu-card-interactive border-black/[0.04] dark:border-white/[0.05]'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Selesai
              </span>
              <div className="w-8 h-8 rounded-xl neu-icon-well flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                {kpiStats.closedCount}
              </span>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Terselesaikan
              </span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
              Aset Operasional Normal
            </p>
          </button>
        </div>
      )}

      {/* ── 3. Quick Status Filter Tabs (Scrollable on Mobile) ─────────────── */}
      <div className="neu-inset-sm bg-[#E5EBF3]/60 dark:bg-[#0D1322]/60 p-1.5 rounded-2xl flex items-center gap-1.5 overflow-x-auto no-scrollbar border border-black/[0.04] dark:border-white/[0.05]">
        {statusFilterTabs.map((tab) => {
          const isActive = currentStatus === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => updateFilters({ status: tab.id })}
              className={cn(
                'px-3.5 py-1.5 text-xs font-bold whitespace-nowrap rounded-xl transition-all',
                isActive
                  ? 'neu-pill-active'
                  : 'neu-pill-inactive text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── 4. Search & Controls Filter Bar ───────────────────────────────── */}
      <div className="p-3.5 sm:p-4 rounded-3xl bg-[#EEF2F7] dark:bg-[#131C31] neu-raised border border-black/[0.04] dark:border-white/[0.05] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input Form */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari nomor kasus, nama aset, kode aset, lokasi, teknisi..."
            className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm rounded-2xl neu-inset text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium focus:outline-none"
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600"
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
          <div className="hidden lg:flex items-center p-1 rounded-2xl neu-inset-sm bg-[#E5EBF3]/60 dark:bg-[#0D1322]/60 border border-black/[0.04] dark:border-white/[0.05]">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={cn(
                'p-2 rounded-xl transition-all',
                viewMode === 'table' ? 'neu-raised-sm bg-[#EEF2F7] dark:bg-[#131C31] text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              )}
              title="Tampilan Tabel"
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={cn(
                'p-2 rounded-xl transition-all',
                viewMode === 'cards' ? 'neu-raised-sm bg-[#EEF2F7] dark:bg-[#131C31] text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
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
          <div className={cn('hidden rounded-3xl bg-[#EEF2F7] dark:bg-[#131C31] neu-raised border border-black/[0.04] dark:border-white/[0.05] overflow-hidden', viewMode === 'table' ? 'lg:block' : 'hidden')}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#E5EBF3] dark:bg-[#101726] border-b border-black/[0.04] dark:border-white/[0.05] text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3.5 px-4">No. Kasus</th>
                    <th className="py-3.5 px-4">Aset & Lokasi</th>
                    <th className="py-3.5 px-4">Prioritas</th>
                    <th className="py-3.5 px-4">Status Perbaikan</th>
                    <th className="py-3.5 px-4">Teknisi PIC</th>
                    <th className="py-3.5 px-4">Target SLA</th>
                    <th className="py-3.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.03] dark:divide-white/[0.03] text-xs text-slate-800 dark:text-slate-200">
                  {initialItems.map((item) => {
                    const slaInfo = getSlaStatus(item.due_date, item.status, (item as any).closed_at);
                    const locationText = [item.areas?.name, item.locations?.name].filter(Boolean).join(' • ');

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group"
                      >
                        {/* No. Kasus & Title */}
                        <td className="py-3.5 px-4 align-top">
                          <Link href={`/cases/${item.id}`} className="block">
                            <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400 neu-inset-sm px-2 py-0.5 rounded-lg border border-black/[0.04] dark:border-white/[0.05]">
                              {item.case_number}
                            </span>
                            <p className="font-extrabold text-slate-800 dark:text-slate-100 mt-1 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {item.title}
                            </p>
                          </Link>
                        </td>

                        {/* Aset & Lokasi */}
                        <td className="py-3.5 px-4 align-top">
                          {item.assets ? (
                            <div>
                              <span className="font-mono font-bold text-[10.5px] text-indigo-600 dark:text-indigo-400 neu-inset-sm px-2 py-0.5 rounded-lg border border-black/[0.04] dark:border-white/[0.05]">
                                {item.assets.asset_code}
                              </span>
                              <p className="font-semibold text-slate-800 dark:text-slate-200 text-[11.5px] mt-0.5">{item.assets.name}</p>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Non-aset / Fasilitas</span>
                          )}
                          {locationText && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[150px]">{locationText}</span>
                            </p>
                          )}
                        </td>

                        {/* Prioritas */}
                        <td className="py-3.5 px-4 align-top">
                          <PriorityBadge priority={item.priority} />
                        </td>

                        {/* Status Perbaikan */}
                        <td className="py-3.5 px-4 align-top">
                          <StatusBadge status={item.status} />
                        </td>

                        {/* Teknisi PIC */}
                        <td className="py-3.5 px-4 align-top">
                          {item.assignee?.full_name ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg neu-icon-well font-black text-[10px] flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                                {item.assignee.full_name[0].toUpperCase()}
                              </div>
                              <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[130px]">
                                {item.assignee.full_name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Belum ditugaskan</span>
                          )}
                        </td>

                        {/* Target SLA */}
                        <td className="py-3.5 px-4 align-top">
                          {slaInfo.type === 'no_sla' ? (
                            <span className="text-slate-400 italic text-[11px]">—</span>
                          ) : slaInfo.isClosed ? (
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border neu-inset-sm',
                                slaInfo.badgeBg,
                                slaInfo.badgeText,
                                slaInfo.badgeBorder
                              )}
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              <span>{slaInfo.badgeLabel}</span>
                            </span>
                          ) : slaInfo.isOverdue ? (
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 text-[10.5px] font-black px-2.5 py-0.5 rounded-full border neu-inset-sm',
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
                                'inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border neu-inset-sm',
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
                              <p className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                                {format(new Date(item.due_date), 'dd MMM yyyy, HH:mm', { locale: localeId })}
                              </p>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                {slaInfo.badgeLabel}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">—</span>
                          )}
                        </td>

                        {/* Aksi Operasional */}
                        <td className="py-3.5 px-4 align-top text-right">
                          <Link
                            href={`/cases/${item.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl fintech-btn-primary font-bold text-xs transition-all active:scale-95"
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
            <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-[#EEF2F7] dark:bg-[#131C31] neu-raised border border-black/[0.04] dark:border-white/[0.05] text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">
                Halaman <strong className="text-slate-800 dark:text-slate-100">{currentPage}</strong> dari <strong className="text-slate-800 dark:text-slate-100">{totalPages}</strong> ({totalCount} perbaikan)
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => updateFilters({ page: String(currentPage - 1) })}
                  className="px-3 py-1.5 rounded-xl neu-btn-secondary font-bold disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => updateFilters({ page: String(currentPage + 1) })}
                  className="px-3 py-1.5 rounded-xl neu-btn-secondary font-bold disabled:opacity-40 disabled:pointer-events-none transition-colors"
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
