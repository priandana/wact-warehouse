'use client';
// components/cases/CasesListClient.tsx
// Interactive Case Command Center Component with 4 KPI Cards, Mobile Cards & Desktop Hybrid Table

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { CaseCard, type CaseCardData } from '@/components/shared/CaseCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { SkeletonList } from '@/components/shared/SkeletonCard';
import { Select } from '@/components/shared/Select';
import { getSlaStatus } from '@/lib/utils/sla';
import Link from 'next/link';
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  AlertCircle,
  SlidersHorizontal,
  FolderOpen,
  Wrench,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatDistanceToNow, isPast, differenceInHours } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface CasesListClientProps {
  initialCases: CaseCardData[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  kpiStats?: {
    openCount: number;
    inProgressCount: number;
    waitingQcCount: number;
    overdueCount: number;
  };
}

const statusOptions = [
  { value: 'all', label: 'Semua Status' },
  { value: 'open', label: 'Open' },
  { value: 'on_progress', label: 'On Progress' },
  { value: 'waiting_repair', label: 'Menunggu Perbaikan' },
  { value: 'waiting_verification', label: 'Verifikasi QC' },
  { value: 'closed', label: 'Selesai' },
  { value: 'reopened', label: 'Reopened' },
  { value: 'overdue', label: '⚠️ Overdue' },
];

const priorityOptions = [
  { value: 'all', label: 'Semua Prioritas' },
  { value: 'critical', label: 'Kritis' },
  { value: 'high', label: 'Tinggi' },
  { value: 'medium', label: 'Sedang' },
  { value: 'low', label: 'Rendah' },
];

const dateOptions = [
  { value: 'all', label: 'Semua Waktu' },
  { value: 'today', label: 'Hari Ini' },
  { value: 'week', label: 'Minggu Ini' },
  { value: 'month', label: 'Bulan Ini' },
];

export function CasesListClient({
  initialCases,
  totalCount,
  currentPage,
  pageSize,
  kpiStats,
}: CasesListClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentSearch = searchParams.get('q') ?? '';
  const currentStatus = searchParams.get('status') ?? 'all';
  const currentPriority = searchParams.get('priority') ?? 'all';
  const currentDate = searchParams.get('date') ?? 'all';

  const [searchInput, setSearchInput] = useState(currentSearch);
  const [showFilters, setShowFilters] = useState(false);

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
    updateFilters({ q: searchInput.trim() });
  };

  const clearAllFilters = () => {
    setSearchInput('');
    startTransition(() => {
      router.push(pathname);
    });
  };

  const activeFilterCount =
    (currentPriority !== 'all' ? 1 : 0) +
    (currentDate !== 'all' ? 1 : 0);

  const hasActiveFilters = Boolean(currentSearch || currentStatus !== 'all' || currentPriority !== 'all' || currentDate !== 'all');

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ── 1. Header with Title, Context & Action ────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Daftar Kasus Warehouse
            </h1>
            <span className="text-xs font-extrabold text-blue-700 bg-blue-50/90 px-2 py-0.5 rounded-full border border-blue-200/70 shadow-2xs">
              {totalCount} Total
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Monitoring perbaikan, eskalasi, dan pemenuhan target SLA operasional
          </p>
        </div>

        <Link
          href="/cases/new"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-xs shadow-blue-600/20 active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Laporkan Kasus</span>
        </Link>
      </div>

      {/* ── 2. Authoritative KPI Metric Overview Cards ─────────────────────── */}
      {kpiStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
          {/* 1. Kasus Open & Reopened */}
          <button
            type="button"
            onClick={() => updateFilters({ status: currentStatus === 'open' ? 'all' : 'open' })}
            className={cn(
              'p-3.5 sm:p-4 rounded-3xl border text-left transition-all group active:scale-[0.98] cursor-pointer',
              currentStatus === 'open' || currentStatus === 'reopened'
                ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20 shadow-[0_4px_16px_-2px_rgba(37,99,235,0.15)]'
                : 'bg-white border-slate-200/80 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] hover:border-blue-300 hover:shadow-[0_8px_20px_-4px_rgba(15,23,42,0.06)] hover:-translate-y-0.5'
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white shadow-xs shadow-blue-500/25 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FolderOpen className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-black text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/70">
                Open &amp; Reopen
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {kpiStats.openCount}
            </p>
            <p className="text-[11px] text-slate-500 font-semibold mt-1 truncate">
              Kasus aktif butuh penanganan
            </p>
          </button>

          {/* 2. Dalam Pengerjaan */}
          <button
            type="button"
            onClick={() => updateFilters({ status: currentStatus === 'on_progress' ? 'all' : 'on_progress' })}
            className={cn(
              'p-3.5 sm:p-4 rounded-3xl border text-left transition-all group active:scale-[0.98] cursor-pointer',
              currentStatus === 'on_progress' || currentStatus === 'waiting_repair'
                ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20 shadow-[0_4px_16px_-2px_rgba(245,158,11,0.15)]'
                : 'bg-white border-slate-200/80 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] hover:border-amber-300 hover:shadow-[0_8px_20px_-4px_rgba(15,23,42,0.06)] hover:-translate-y-0.5'
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-600 text-white shadow-xs shadow-amber-500/25 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Wrench className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-black text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/70">
                On Progress
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {kpiStats.inProgressCount}
            </p>
            <p className="text-[11px] text-slate-500 font-semibold mt-1 truncate">
              Sedang ditangani staf/PIC
            </p>
          </button>

          {/* 3. Menunggu QC */}
          <button
            type="button"
            onClick={() => updateFilters({ status: currentStatus === 'waiting_verification' ? 'all' : 'waiting_verification' })}
            className={cn(
              'p-3.5 sm:p-4 rounded-3xl border text-left transition-all group active:scale-[0.98] cursor-pointer',
              currentStatus === 'waiting_verification'
                ? 'bg-purple-50/80 border-purple-300 ring-2 ring-purple-500/20 shadow-[0_4px_16px_-2px_rgba(168,85,247,0.15)]'
                : 'bg-white border-slate-200/80 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] hover:border-purple-300 hover:shadow-[0_8px_20px_-4px_rgba(15,23,42,0.06)] hover:-translate-y-0.5'
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white shadow-xs shadow-purple-500/25 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-black text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200/70">
                QC Verify
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {kpiStats.waitingQcCount}
            </p>
            <p className="text-[11px] text-slate-500 font-semibold mt-1 truncate">
              Verifikasi perbaikan
            </p>
          </button>

          {/* 4. Lewat SLA (Overdue) */}
          <button
            type="button"
            onClick={() => updateFilters({ status: currentStatus === 'overdue' ? 'all' : 'overdue' })}
            className={cn(
              'p-3.5 sm:p-4 rounded-3xl border text-left transition-all group active:scale-[0.98] cursor-pointer',
              currentStatus === 'overdue'
                ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-500/20 shadow-[0_4px_16px_-2px_rgba(244,63,94,0.15)]'
                : 'bg-white border-slate-200/80 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] hover:border-rose-300 hover:shadow-[0_8px_20px_-4px_rgba(15,23,42,0.06)] hover:-translate-y-0.5'
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-rose-500 to-red-600 text-white shadow-xs shadow-rose-500/25 flex items-center justify-center group-hover:scale-110 transition-transform">
                <AlertCircle className="w-4 h-4" />
              </div>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200/80">
                {kpiStats.overdueCount > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                )}
                Overdue
              </span>
            </div>
            <p className={cn('text-xl sm:text-2xl font-black tracking-tight', kpiStats.overdueCount > 0 ? 'text-rose-600' : 'text-slate-900')}>
              {kpiStats.overdueCount}
            </p>
            <p className="text-[11px] text-slate-500 font-semibold mt-1 truncate">
              Melebihi batas waktu SLA
            </p>
          </button>
        </div>
      )}

      {/* ── 3. Search & Filter Bar ────────────────────────────────────────── */}
      <div className="space-y-2.5">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari nomor kasus (WHC-...), judul kasus, atau aset..."
              className="w-full pl-9 pr-8 py-2.5 rounded-2xl bg-white border border-slate-200/80 text-slate-900 text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs transition-all"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  updateFilters({ q: null });
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl border text-xs font-bold shadow-2xs transition-all active:scale-95',
              showFilters || activeFilterCount > 0
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-slate-200/80 text-slate-700 hover:bg-slate-50'
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filter</span>
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </form>

        {/* Status Horizontal Pill Tabs with visible scroll affordance */}
        <div className="relative">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 pr-10 scroll-smooth">
            {statusOptions.map((opt) => {
              const isSelected = currentStatus === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => updateFilters({ status: opt.value })}
                  className={cn(
                    'px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all select-none shrink-0 cursor-pointer active:scale-95',
                    isSelected
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25'
                      : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-2xs'
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-[#F8FAFC] via-[#F8FAFC]/80 to-transparent" />
        </div>

        {/* Advanced Filters Drawer */}
        {showFilters && (
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800">Filter Tambahan</span>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="text-[11px] font-bold text-rose-600 hover:underline"
                >
                  Reset Semua Filter
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Priority Select */}
              <Select
                label="Prioritas Kasus"
                value={currentPriority}
                onChange={(val) => updateFilters({ priority: val })}
                options={priorityOptions}
                size="sm"
                variant="filter"
              />

              {/* Date Select */}
              <Select
                label="Rentang Tanggal Pelaporan"
                value={currentDate}
                onChange={(val) => updateFilters({ date: val })}
                options={dateOptions}
                size="sm"
                variant="filter"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── 4. Content Section ───────────────────────────────────────────── */}
      {isPending ? (
        <SkeletonList count={4} />
      ) : initialCases.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Tidak ada kasus ditemukan"
          description={
            hasActiveFilters
              ? "Tidak ada kasus yang cocok dengan kriteria pencarian atau filter aktif."
              : "Belum ada laporan kasus operasional di gudang ini."
          }
          action={
            hasActiveFilters ? (
              <button
                onClick={clearAllFilters}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                Reset Filter
              </button>
            ) : (
              <Link
                href="/cases/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Laporkan Kasus Baru</span>
              </Link>
            )
          }
        />
      ) : (
        <>
          {/* MOBILE VIEW: Case Cards Feed (Strict 16px Gutter) */}
          <div className="block md:hidden space-y-3">
            {initialCases.map((item) => (
              <CaseCard key={item.id} item={item} />
            ))}
          </div>

          {/* DESKTOP VIEW: High-Density Operational Hybrid Table */}
          <div className="hidden md:block overflow-hidden rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Kasus & Judul</th>
                  <th className="py-3 px-4">Lokasi & Aset</th>
                  <th className="py-3 px-4">Prioritas</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">PIC Ditugaskan</th>
                  <th className="py-3 px-4">Target SLA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {initialCases.map((item) => {
                  const slaInfo = getSlaStatus(item.due_date, item.status, (item as any).closed_at);
                  const locationText = [item.areas?.name, item.locations?.name].filter(Boolean).join(' • ');

                  return (
                    <tr
                      key={item.id}
                      onClick={() => router.push(`/cases/${item.id}`)}
                      className={cn(
                        'hover:bg-slate-50/90 cursor-pointer transition-colors group',
                        slaInfo.isOverdue && !slaInfo.isClosed && 'bg-rose-50/15'
                      )}
                    >
                      {/* Kasus */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className="font-mono font-extrabold text-blue-700 text-[10.5px] bg-blue-50/90 px-1.5 py-0.5 rounded-md border border-blue-100/80 shadow-2xs">
                            {item.case_number}
                          </span>
                          {item.requires_maintenance && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50/90 text-amber-800 text-[10px] font-bold border border-amber-200/70 shadow-2xs" title="Maintenance Diperlukan">
                              <Wrench className="w-2.5 h-2.5 text-amber-600" />
                              <span>Maintenance</span>
                            </span>
                          )}
                          {item.has_operational_impact && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-50/90 text-rose-700 text-[10px] font-extrabold border border-rose-200/70 shadow-2xs" title="Berdampak Operasional">
                              <AlertCircle className="w-2.5 h-2.5 text-rose-600" />
                              <span>Operasional</span>
                            </span>
                          )}
                        </div>
                        <p className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                          {item.title}
                        </p>
                      </td>

                      {/* Lokasi & Aset */}
                      <td className="py-3.5 px-4 text-slate-600 max-w-[180px]">
                        {item.assets ? (
                          <div className="mb-0.5">
                            <span className="font-mono font-bold text-indigo-700 text-[10.5px] bg-indigo-50/90 px-1.5 py-0.5 rounded border border-indigo-100/80">
                              {item.assets.asset_code}
                            </span>
                            <p className="font-bold text-slate-800 text-[11px] truncate mt-0.5">{item.assets.name}</p>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Non-aset / Fasilitas</span>
                        )}
                        {locationText && (
                          <p className="text-[11px] text-slate-500 font-medium truncate flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{locationText}</span>
                          </p>
                        )}
                      </td>

                      {/* Prioritas */}
                      <td className="py-3.5 px-4">
                        <PriorityBadge priority={item.priority} />
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <StatusBadge status={item.status} />
                      </td>

                      {/* PIC Ditugaskan */}
                      <td className="py-3.5 px-4">
                        {item.assignee ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                              {item.assignee.full_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold text-slate-800 text-[11.5px] truncate max-w-[120px]">
                              {item.assignee.full_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Belum Ditugaskan</span>
                        )}
                      </td>

                      {/* SLA */}
                      <td className="py-3.5 px-4">
                        {slaInfo.type === 'no_sla' ? (
                          <span className="text-slate-400 text-xs">—</span>
                        ) : slaInfo.isClosed ? (
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full border shadow-2xs',
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
                              'inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full border shadow-2xs',
                              slaInfo.badgeBg,
                              slaInfo.badgeText,
                              slaInfo.badgeBorder
                            )}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            <span>{slaInfo.badgeLabel}</span>
                          </span>
                        ) : (
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full border shadow-2xs',
                              slaInfo.badgeBg,
                              slaInfo.badgeText,
                              slaInfo.badgeBorder
                            )}
                          >
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{slaInfo.badgeLabel}</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── 5. Pagination ────────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 pb-3">
              <p className="text-xs text-slate-500 font-medium">
                Halaman <span className="font-bold text-slate-800">{currentPage}</span> dari <span className="font-bold text-slate-800">{totalPages}</span>
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => updateFilters({ page: String(currentPage - 1) })}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200/80 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-all shadow-2xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Sebelumnya</span>
                </button>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => updateFilters({ page: String(currentPage + 1) })}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200/80 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-all shadow-2xs"
                >
                  <span>Selanjutnya</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
