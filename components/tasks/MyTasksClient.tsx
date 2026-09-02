'use client';
// components/tasks/MyTasksClient.tsx
// Interactive PIC Task Command Center Component in WACT V2 Design Language
// Personal Assignment Queue with KPI Cards, Search/Filters, Desktop Workspace & Mobile Feed

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { TaskCard, type TaskItemData } from '@/components/tasks/TaskCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Select } from '@/components/shared/Select';
import { getSlaStatus } from '@/lib/utils/sla';
import {
  ClipboardCheck,
  Search,
  X,
  Clock,
  MapPin,
  CheckCircle2,
  Package,
  PlayCircle,
  Wrench,
  Inbox,
  AlertTriangle,
  LayoutGrid,
  Table as TableIcon,
  ArrowUpRight,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatDistanceToNow, isPast, differenceInHours, format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface MyTasksClientProps {
  initialTasks: TaskItemData[];
  warehouseName?: string;
  warehouseCode?: string;
}

const statusFilterTabs = [
  { id: 'all', label: 'Semua Tugas' },
  { id: 'open', label: 'Perlu Dikerjakan' },
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

export function MyTasksClient({ initialTasks, warehouseName, warehouseCode }: MyTasksClientProps) {
  const [currentStatus, setCurrentStatus] = useState<string>('all');
  const [currentPriority, setCurrentPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Compute Authoritative KPIs strictly from user's current assigned task set
  const now = new Date();
  const kpiStats = useMemo(() => {
    const openCount = initialTasks.filter((t) => t.status === 'open' || t.status === 'reopened').length;
    const inProgressCount = initialTasks.filter((t) => t.status === 'on_progress' || t.status === 'waiting_repair').length;
    const waitingQcCount = initialTasks.filter((t) => t.status === 'waiting_verification').length;
    const closedCount = initialTasks.filter((t) => t.status === 'closed').length;
    const overdueCount = initialTasks.filter(
      (t) => t.status !== 'closed' && t.due_date && new Date(t.due_date) <= now
    ).length;

    return { openCount, inProgressCount, waitingQcCount, closedCount, overdueCount };
  }, [initialTasks, now]);

  // Filter tasks strictly in-memory over the user's authorized assigned task set
  const filteredTasks = useMemo(() => {
    return initialTasks.filter((task) => {
      // 1. Status Filter
      if (currentStatus !== 'all') {
        if (currentStatus === 'open') {
          if (task.status !== 'open' && task.status !== 'reopened') return false;
        } else if (currentStatus === 'on_progress') {
          if (task.status !== 'on_progress' && task.status !== 'waiting_repair') return false;
        } else if (currentStatus === 'waiting_verification') {
          if (task.status !== 'waiting_verification') return false;
        } else if (currentStatus === 'closed') {
          if (task.status !== 'closed') return false;
        } else if (currentStatus === 'overdue') {
          const isOverdue = task.status !== 'closed' && task.due_date && new Date(task.due_date) <= now;
          if (!isOverdue) return false;
        }
      }

      // 2. Priority Filter
      if (currentPriority !== 'all' && task.priority !== currentPriority) {
        return false;
      }

      // 3. Search Filter (Case Number, Title, Description, Asset, Location)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNumber = task.case_number?.toLowerCase().includes(q);
        const matchesTitle = task.title?.toLowerCase().includes(q);
        const matchesDesc = task.description?.toLowerCase().includes(q);
        const matchesAsset =
          task.assets?.asset_code?.toLowerCase().includes(q) || task.assets?.name?.toLowerCase().includes(q);
        const matchesArea = task.areas?.name?.toLowerCase().includes(q);
        const matchesLoc = task.locations?.name?.toLowerCase().includes(q);

        if (!matchesNumber && !matchesTitle && !matchesDesc && !matchesAsset && !matchesArea && !matchesLoc) {
          return false;
        }
      }

      return true;
    });
  }, [initialTasks, currentStatus, currentPriority, searchQuery]);

  const handleClearFilters = () => {
    setCurrentStatus('all');
    setCurrentPriority('all');
    setSearchQuery('');
  };

  return (
    <div className="w-full space-y-5 pb-24 sm:pb-8">
      {/* ── 1. Header Command Area ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-700 shadow-2xs">
              <ClipboardCheck className="w-4 h-4 stroke-[2.5]" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Pusat Tugas & Penugasan PIC
            </h1>
          </div>
          <p className="text-xs sm:text-[13px] text-slate-500 font-semibold mt-1">
            Daftar tugas operasional dan perbaikan yang saat ini ditugaskan kepada Anda
            {warehouseName ? ` • ${warehouseName}` : ''}
          </p>
        </div>

        {kpiStats.overdueCount > 0 && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-800 text-xs font-bold shadow-2xs self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
            <span>{kpiStats.overdueCount} Tugas Melewati Batas SLA</span>
          </div>
        )}
      </div>

      {/* ── 2. KPI Summary Grid (4 High-Clarity Fintech Cards) ───────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
        {/* KPI 1: Perlu Dikerjakan */}
        <button
          type="button"
          onClick={() => setCurrentStatus('open')}
          className={cn(
            'p-3.5 sm:p-4 rounded-3xl border text-left transition-all relative overflow-hidden group shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] active:scale-[0.98] cursor-pointer',
            currentStatus === 'open'
              ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20 shadow-[0_4px_16px_-2px_rgba(37,99,235,0.15)]'
              : 'bg-white border-slate-200/80 hover:border-blue-300 hover:shadow-[0_8px_20px_-4px_rgba(15,23,42,0.06)] hover:-translate-y-0.5'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/70">
              Perlu Dikerjakan
            </span>
            <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white shadow-xs shadow-blue-500/25 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Inbox className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {kpiStats.openCount}
            </span>
            <span className="text-[11px] font-bold text-slate-500">
              Tugas Aktif
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-bold mt-1">
            Open & Reopened
          </p>
        </button>

        {/* KPI 2: Sedang Dikerjakan */}
        <button
          type="button"
          onClick={() => setCurrentStatus('on_progress')}
          className={cn(
            'p-3.5 sm:p-4 rounded-3xl border text-left transition-all relative overflow-hidden group shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] active:scale-[0.98] cursor-pointer',
            currentStatus === 'on_progress'
              ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20 shadow-[0_4px_16px_-2px_rgba(245,158,11,0.15)]'
              : 'bg-white border-slate-200/80 hover:border-amber-300 hover:shadow-[0_8px_20px_-4px_rgba(15,23,42,0.06)] hover:-translate-y-0.5'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-black uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/70">
              Sedang Dikerjakan
            </span>
            <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-600 text-white shadow-xs shadow-amber-500/25 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {kpiStats.inProgressCount}
            </span>
            <span className="text-[11px] font-bold text-slate-500">
              Dalam Proses
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-bold mt-1">
            Tindakan Lapangan
          </p>
        </button>

        {/* KPI 3: Menunggu Verifikasi QC */}
        <button
          type="button"
          onClick={() => setCurrentStatus('waiting_verification')}
          className={cn(
            'p-3.5 sm:p-4 rounded-3xl border text-left transition-all relative overflow-hidden group shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] active:scale-[0.98] cursor-pointer',
            currentStatus === 'waiting_verification'
              ? 'bg-purple-50/80 border-purple-300 ring-2 ring-purple-500/20 shadow-[0_4px_16px_-2px_rgba(168,85,247,0.15)]'
              : 'bg-white border-slate-200/80 hover:border-purple-300 hover:shadow-[0_8px_20px_-4px_rgba(15,23,42,0.06)] hover:-translate-y-0.5'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200/70">
              Verifikasi QC
            </span>
            <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white shadow-xs shadow-purple-500/25 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {kpiStats.waitingQcCount}
            </span>
            <span className="text-[11px] font-bold text-slate-500">
              Menunggu Review
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-bold mt-1">
            Validasi Hasil Perbaikan
          </p>
        </button>

        {/* KPI 4: Selesai */}
        <button
          type="button"
          onClick={() => setCurrentStatus('closed')}
          className={cn(
            'p-3.5 sm:p-4 rounded-3xl border text-left transition-all relative overflow-hidden group shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] active:scale-[0.98] cursor-pointer',
            currentStatus === 'closed'
              ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500/20 shadow-[0_4px_16px_-2px_rgba(16,185,129,0.15)]'
              : 'bg-white border-slate-200/80 hover:border-emerald-300 hover:shadow-[0_8px_20px_-4px_rgba(15,23,42,0.06)] hover:-translate-y-0.5'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/70">
              Selesai (Closed)
            </span>
            <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-emerald-400 to-emerald-600 text-white shadow-xs shadow-emerald-500/25 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {kpiStats.closedCount}
            </span>
            <span className="text-[11px] font-bold text-slate-500">
              Terselesaikan
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-bold mt-1">
            Riwayat Tugas Selesai
          </p>
        </button>
      </div>

      {/* ── 3. Quick Status Filter Tabs (Scrollable on Mobile) ─────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {statusFilterTabs.map((tab) => {
          const isActive = currentStatus === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCurrentStatus(tab.id)}
              className={cn(
                'px-3.5 py-1.5 text-xs font-bold whitespace-nowrap rounded-full transition-all shrink-0 cursor-pointer active:scale-95',
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25'
                  : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-2xs'
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── 4. Search & Controls Filter Bar ───────────────────────────────── */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input (Strictly inside user's assigned dataset) */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nomor kasus, judul tugas, nama aset, lokasi..."
            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-hidden transition-all text-slate-900 placeholder:text-slate-400 font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Priority Filter & View Mode Controls */}
        <div className="flex items-center gap-2">
          <div className="w-44">
            <Select
              value={currentPriority}
              onChange={(val) => setCurrentPriority(val)}
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

      {/* ── 5. Main Content Area (Workspace Table / Mobile Card Feed) ─────── */}
      {initialTasks.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Tidak Ada Tugas Aktif"
          description="Saat ini belum ada tugas operasional atau perbaikan yang dialokasikan kepada Anda pada gudang ini."
        />
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Tugas Tidak Ditemukan"
          description="Tidak ada tugas yang cocok dengan filter atau kata kunci pencarian Anda."
          action={
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors"
            >
              Reset Semua Filter
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          {/* Mobile Feed (< lg) & Desktop Card View */}
          <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-3.5', viewMode === 'table' ? 'lg:hidden' : 'grid')}>
            {filteredTasks.map((item) => (
              <TaskCard key={item.id} item={item} />
            ))}
          </div>

          {/* Desktop High-Density Table Workspace (>= lg) */}
          <div
            className={cn(
              'hidden rounded-2xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden',
              viewMode === 'table' ? 'lg:block' : 'hidden'
            )}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">No. Kasus & Tugas</th>
                    <th className="py-3 px-4">Aset & Lokasi</th>
                    <th className="py-3 px-4">Prioritas</th>
                    <th className="py-3 px-4">Status Tugas</th>
                    <th className="py-3 px-4">Target SLA</th>
                    <th className="py-3 px-4 text-right">Tindakan Selanjutnya</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                  {filteredTasks.map((item) => {
                    const slaInfo = getSlaStatus(item.due_date, item.status, (item as any).closed_at);
                    const locationText = [item.areas?.name, item.locations?.name].filter(Boolean).join(' • ');

                    // Contextual Action CTA
                    let ctaText = 'Lihat Detail';
                    let ctaButtonClass = 'bg-slate-900 hover:bg-slate-800 text-white';

                    if (item.status === 'open' || item.status === 'reopened') {
                      ctaText = 'Mulai Kerjakan';
                      ctaButtonClass = 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs';
                    } else if (item.status === 'on_progress' || item.status === 'waiting_repair') {
                      ctaText = 'Update Progres';
                      ctaButtonClass = 'bg-amber-600 hover:bg-amber-700 text-white shadow-2xs';
                    } else if (item.status === 'waiting_verification') {
                      ctaText = 'Lihat Status QC';
                      ctaButtonClass = 'bg-purple-600 hover:bg-purple-700 text-white shadow-2xs';
                    } else if (item.status === 'closed') {
                      ctaText = 'Lihat Riwayat';
                      ctaButtonClass = 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200';
                    }

                    return (
                      <tr key={item.id} className="hover:bg-blue-50/40 transition-colors group">
                        {/* No. Kasus & Judul */}
                        <td className="py-3 px-4 align-top">
                          <Link href={`/cases/${item.id}`} className="block">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/60">
                                {item.case_number}
                              </span>
                              {item.requires_maintenance && (
                                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/60">
                                  Maintenance
                                </span>
                              )}
                            </div>
                            <p className="font-extrabold text-slate-900 mt-1 leading-snug group-hover:text-blue-600 transition-colors max-w-sm">
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

                        {/* Status Tugas */}
                        <td className="py-3 px-4 align-top">
                          <StatusBadge status={item.status} />
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

                        {/* Tindakan Selanjutnya */}
                        <td className="py-3 px-4 align-top text-right">
                          <Link
                            href={`/cases/${item.id}`}
                            className={cn(
                              'inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all active:scale-95',
                              ctaButtonClass
                            )}
                          >
                            <span>{ctaText}</span>
                            <ArrowUpRight className="w-3.5 h-3.5 opacity-70" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
