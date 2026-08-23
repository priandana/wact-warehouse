'use client';
// components/cases/CasesListClient.tsx
// Interactive Cases List Component with Mobile Cards & Desktop Table Hybrid

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { CaseCard, type CaseCardData } from '@/components/shared/CaseCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { SkeletonList } from '@/components/shared/SkeletonCard';
import Link from 'next/link';
import {
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Clock,
  MapPin,
  AlertCircle,
  SlidersHorizontal,
  RefreshCw,
  FolderOpen,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { format, formatDistanceToNow, isPast, differenceInHours } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface CasesListClientProps {
  initialCases: CaseCardData[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
}

const statusOptions = [
  { value: 'all', label: 'Semua Status' },
  { value: 'open', label: 'Open' },
  { value: 'on_progress', label: 'On Progress' },
  { value: 'waiting_repair', label: 'Waiting Repair' },
  { value: 'waiting_verification', label: 'Waiting Verify' },
  { value: 'closed', label: 'Closed' },
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

    // Reset page to 1 on filter changes unless explicit page update
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

  const hasActiveFilters = currentSearch || currentStatus !== 'all' || currentPriority !== 'all' || currentDate !== 'all';

  return (
    <div className="space-y-4">
      {/* ── 1. Page Header with Title & Action ───────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Daftar Kasus Warehouse
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Total {totalCount} kasus tercatat di sistem
          </p>
        </div>

        <Link
          href="/cases/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-600/30 active:scale-95 transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Laporkan Kasus</span>
        </Link>
      </div>

      {/* ── 2. Search Bar & Filter Controls ─────────────────────────────── */}
      <div className="space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari nomor kasus atau judul..."
              className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-900 text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm transition-all"
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
              'inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl border text-xs font-bold shadow-sm transition-all active:scale-95',
              showFilters || hasActiveFilters
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filter</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-blue-600" />
            )}
          </button>
        </form>

        {/* Status Horizontal Pill Filters (Fintech quick filter tabs) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {statusOptions.slice(0, 5).map((opt) => {
            const isSelected = currentStatus === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => updateFilters({ status: opt.value })}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all select-none',
                  isSelected
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50'
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Collapsible Advanced Filters Drawer */}
        {showFilters && (
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800">Filter Detail</span>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="text-[11px] font-bold text-rose-600 hover:underline"
                >
                  Reset Filter
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Status Select */}
              <div>
                <label className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Status
                </label>
                <select
                  value={currentStatus}
                  onChange={(e) => updateFilters({ status: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Priority Select */}
              <div>
                <label className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Prioritas
                </label>
                <select
                  value={currentPriority}
                  onChange={(e) => updateFilters({ priority: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {priorityOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Date Select */}
              <div>
                <label className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Rentang Tanggal
                </label>
                <select
                  value={currentDate}
                  onChange={(e) => updateFilters({ date: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {dateOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 3. Content Section: Mobile Cards & Desktop Table Hybrid ──────── */}
      {isPending ? (
        <SkeletonList count={4} />
      ) : initialCases.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Tidak ada kasus ditemukan"
          description={
            hasActiveFilters
              ? "Coba ubah kata kunci pencarian atau reset filter untuk melihat kasus lainnya."
              : "Belum ada kasus yang dilaporkan di gudang ini."
          }
          action={
            hasActiveFilters ? (
              <button
                onClick={clearAllFilters}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                Reset Semua Filter
              </button>
            ) : (
              <Link
                href="/cases/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-sm hover:bg-blue-700 transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Laporkan Kasus Baru</span>
              </Link>
            )
          }
        />
      ) : (
        <>
          {/* MOBILE VIEW: Modern Fintech Cards Feed */}
          <div className="block md:hidden space-y-3">
            {initialCases.map((item) => (
              <CaseCard key={item.id} item={item} />
            ))}
          </div>

          {/* DESKTOP VIEW: Professional Hybrid Table */}
          <div className="hidden md:block overflow-hidden rounded-2xl bg-white border border-slate-200/80 shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Kasus</th>
                  <th className="py-3 px-4">Area / Lokasi</th>
                  <th className="py-3 px-4">Prioritas</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">PIC</th>
                  <th className="py-3 px-4">SLA / Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {initialCases.map((item) => {
                  const isOverdue = item.due_date && isPast(new Date(item.due_date)) && item.status !== 'closed';
                  const locationText = [item.areas?.name, item.locations?.name].filter(Boolean).join(' • ');

                  return (
                    <tr
                      key={item.id}
                      onClick={() => router.push(`/cases/${item.id}`)}
                      className={cn(
                        'hover:bg-slate-50/80 cursor-pointer transition-colors group',
                        isOverdue && 'bg-rose-50/30'
                      )}
                    >
                      {/* Kasus Title & Number */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono font-bold text-blue-600 text-[11px] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                            {item.case_number}
                          </span>
                          <span className="text-[10.5px] text-slate-400 font-medium">
                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: localeId })}
                          </span>
                        </div>
                        <p className="font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                          {item.title}
                        </p>
                      </td>

                      {/* Area / Lokasi */}
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {locationText ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[150px]">{locationText}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Prioritas */}
                      <td className="py-3.5 px-4">
                        <PriorityBadge priority={item.priority} size="sm" />
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <StatusBadge status={item.status} size="sm" />
                      </td>

                      {/* PIC */}
                      <td className="py-3.5 px-4 text-slate-600">
                        {item.assignee?.full_name ? (
                          <div className="flex items-center gap-1.5 font-medium">
                            <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-700">
                              {item.assignee.full_name[0].toUpperCase()}
                            </div>
                            <span className="truncate max-w-[120px]">{item.assignee.full_name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Belum ditugaskan</span>
                        )}
                      </td>

                      {/* SLA Due Date */}
                      <td className="py-3.5 px-4">
                        {item.status === 'closed' ? (
                          <span className="text-emerald-600 font-semibold text-[11px] flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            Selesai
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center gap-1 font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 text-[11px] animate-pulse">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Overdue
                          </span>
                        ) : item.due_date ? (
                          <span className="text-slate-500 font-medium text-[11px] flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {formatDistanceToNow(new Date(item.due_date), { addSuffix: true, locale: localeId })}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── 4. Pagination Controls ────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 pb-4">
              <p className="text-xs text-slate-500 font-medium">
                Halaman <span className="font-bold text-slate-800">{currentPage}</span> dari <span className="font-bold text-slate-800">{totalPages}</span>
              </p>

              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => updateFilters({ page: String(currentPage - 1) })}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-all shadow-sm"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Sebelumnya</span>
                </button>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => updateFilters({ page: String(currentPage + 1) })}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-all shadow-sm"
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
