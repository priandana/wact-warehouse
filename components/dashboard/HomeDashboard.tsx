'use client';
// components/dashboard/HomeDashboard.tsx
// WACT Visual Benchmark — Modern Fintech & Operational Warehouse Dashboard

import { useActiveWarehouse } from '@/components/shared/layout/AppShellProvider';
import { CaseCard, type CaseCardData } from '@/components/shared/CaseCard';
import { EmptyState } from '@/components/shared/EmptyState';
import Link from 'next/link';
import {
  Plus,
  QrCode,
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FolderOpen,
  ArrowRight,
  Sparkles,
  Flame,
  Check,
  UserCheck,
  Building2,
} from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface DashboardStats {
  openCount: number;
  onProgressCount: number;
  overdueCount: number;
  closedTodayCount: number;
}

interface HomeDashboardProps {
  userName: string;
  stats: DashboardStats;
  needsAttentionCases: CaseCardData[];
  myTasksCases: CaseCardData[];
  recentCases: CaseCardData[];
}

export function HomeDashboard({
  userName,
  stats,
  needsAttentionCases,
  myTasksCases,
  recentCases,
}: HomeDashboardProps) {
  const { activeWarehouse } = useActiveWarehouse();

  // Dynamic greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const currentDateFormatted = format(new Date(), 'EEEE, d MMMM yyyy', { locale: localeId });
  const firstName = userName ? userName.split(' ')[0] : 'Pengguna';

  return (
    <div className="space-y-4 sm:space-y-5 pb-6 animate-in fade-in duration-150">
      {/* ── 1. Executive Operational Hero Banner ─────────────────────────── */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs p-3.5 sm:p-5 relative overflow-hidden">
        {/* Subtle ambient gradient tint at top right */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-blue-50/60 via-indigo-50/20 to-transparent rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-1">
            {/* Shift Date & Operational Status Indicator */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100/90 text-slate-600 font-semibold text-[10.5px] sm:text-[11px] border border-slate-200/60">
                <Sparkles className="w-3 h-3 text-blue-600 shrink-0" />
                <span>{currentDateFormatted}</span>
              </span>

              {stats.overdueCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[10.5px] sm:text-[11px] border border-rose-200/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                  <span>Perlu Tindakan SLA ({stats.overdueCount} Overdue)</span>
                </span>
              ) : stats.openCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[10.5px] sm:text-[11px] border border-blue-200/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  <span>{stats.openCount} Kasus Aktif</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10.5px] sm:text-[11px] border border-emerald-200/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>Operasional Normal & Terkendali</span>
                </span>
              )}
            </div>

            {/* Personalized Greeting */}
            <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
              {`${getGreeting()}, `}<span className="text-blue-600">{firstName}</span> 👋
            </h1>
            <p className="text-[11.5px] sm:text-xs text-slate-500 font-medium leading-relaxed max-w-lg">
              Pusat kendali monitoring aset, audit checklist QC, dan penanganan kasus operasional.
            </p>
          </div>

          {/* Desktop Only: Lightweight Integrated Operational Summary */}
          {activeWarehouse && (
            <div className="hidden md:flex flex-col items-end text-right justify-center shrink-0 pl-5 border-l border-slate-100">
              <div className="flex items-center gap-1.5 justify-end">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 ring-2 ring-emerald-100" />
                <span className="text-xs font-black text-slate-900 tracking-tight">{activeWarehouse.warehouseCode}</span>
                <span className="text-xs text-slate-500 font-medium truncate max-w-[150px]">
                  • {activeWarehouse.warehouseName}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 mt-1">
                <span className={stats.openCount > 0 ? 'text-blue-600 font-bold' : 'text-slate-600'}>
                  {stats.openCount} Open
                </span>
                <span className="text-slate-300">•</span>
                <span className={stats.onProgressCount > 0 ? 'text-purple-600 font-bold' : 'text-slate-600'}>
                  {stats.onProgressCount} Progress
                </span>
                <span className="text-slate-300">•</span>
                <span className={stats.overdueCount > 0 ? 'text-rose-600 font-bold' : 'text-emerald-700 font-bold'}>
                  {stats.overdueCount > 0 ? `${stats.overdueCount} Overdue` : '0 Overdue'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 2. Compact Fintech KPI Metrics ───────────────────────────────── */}
      <section aria-label="Status Kasus">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {/* 1. Open */}
          <Link
            href="/cases?status=open"
            className="p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs hover:border-blue-300 active:scale-[0.98] transition-all group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">Open</span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-100/60 flex items-center justify-center group-hover:scale-105 transition-transform">
                <FolderOpen className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">{stats.openCount}</p>
            <p className="text-[10.5px] font-bold text-blue-600 mt-1">Kasus baru</p>
          </Link>

          {/* 2. On Progress */}
          <Link
            href="/cases?status=on_progress"
            className="p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs hover:border-purple-300 active:scale-[0.98] transition-all group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">On Progress</span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-purple-50 text-purple-600 border border-purple-100/60 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">{stats.onProgressCount}</p>
            <p className="text-[10.5px] font-bold text-purple-600 mt-1">Sedang dikerjakan</p>
          </Link>

          {/* 3. Overdue (Alert Highlight) */}
          <Link
            href="/cases?status=overdue"
            className={`p-3 sm:p-3.5 rounded-2xl bg-white border shadow-2xs hover:shadow-xs active:scale-[0.98] transition-all group relative overflow-hidden ${
              stats.overdueCount > 0
                ? 'border-rose-200 bg-rose-50/20 hover:border-rose-300'
                : 'border-slate-200/80 hover:border-rose-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-rose-600">Overdue</span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-rose-50 text-rose-600 border border-rose-100/80 flex items-center justify-center group-hover:scale-105 transition-transform">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight leading-none">{stats.overdueCount}</p>
            <p className="text-[10.5px] font-bold text-rose-600 mt-1 flex items-center gap-1">
              {stats.overdueCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />}
              <span>Melewati SLA</span>
            </p>
          </Link>

          {/* 4. Closed Today */}
          <Link
            href="/cases?status=closed"
            className="p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs hover:border-emerald-300 active:scale-[0.98] transition-all group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">Selesai Hari Ini</span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100/60 flex items-center justify-center group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">{stats.closedTodayCount}</p>
            <p className="text-[10.5px] font-bold text-emerald-600 mt-1">Terverifikasi QC</p>
          </Link>
        </div>
      </section>

      {/* ── 3. Quick Action Shortcuts (Functional Tinting) ───────────────── */}
      <section aria-label="Aksi Cepat">
        <h2 className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 mb-2 px-1">
          Aksi Cepat
        </h2>
        <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
          {/* 1. Laporkan Kasus (Primary Gradient Action) */}
          <Link
            href="/cases/new"
            className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xs shadow-blue-500/20 active:scale-95 transition-all text-center group"
          >
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
              <Plus className="w-4 h-4 text-white stroke-[2.5]" />
            </div>
            <span className="text-[10.5px] sm:text-[11px] font-bold leading-tight">Laporkan</span>
          </Link>

          {/* 2. Scan QR (Subtle Amber Functional Tint) */}
          <Link
            href="/assets"
            className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-amber-50/40 hover:bg-amber-50/80 border border-amber-200/60 shadow-2xs active:scale-95 transition-all text-center group"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-100/70 text-amber-700 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
              <QrCode className="w-4 h-4" />
            </div>
            <span className="text-[10.5px] sm:text-[11px] font-bold text-slate-800 leading-tight">Scan QR</span>
          </Link>

          {/* 3. QC Check (Subtle Emerald Functional Tint) */}
          <Link
            href="/inspections"
            className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-emerald-50/40 hover:bg-emerald-50/80 border border-emerald-200/60 shadow-2xs active:scale-95 transition-all text-center group"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
              <ClipboardCheck className="w-4 h-4" />
            </div>
            <span className="text-[10.5px] sm:text-[11px] font-bold text-slate-800 leading-tight">Inspeksi</span>
          </Link>

          {/* 4. Tugas Saya (Subtle Purple Functional Tint) */}
          <Link
            href="/my-tasks"
            className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-purple-50/40 hover:bg-purple-50/80 border border-purple-200/60 shadow-2xs active:scale-95 transition-all text-center group"
          >
            <div className="w-8 h-8 rounded-xl bg-purple-100/70 text-purple-700 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
              <UserCheck className="w-4 h-4" />
            </div>
            <span className="text-[10.5px] sm:text-[11px] font-bold text-slate-800 leading-tight">Tugasku</span>
          </Link>
        </div>
      </section>

      {/* ── 4. Main Feeds Section (Desktop 2-Col / Mobile Stack) ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        {/* Left Column (7 cols): Needs Attention & My Tasks */}
        <div className="lg:col-span-7 space-y-4 sm:space-y-4.5">
          {/* Perlu Perhatian Segera */}
          <section>
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                <h2 className="text-xs font-extrabold uppercase tracking-wide text-slate-900">
                  Perlu Perhatian Segera
                </h2>
              </div>
              {needsAttentionCases.length > 0 && (
                <span className="text-[10.5px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/80">
                  {needsAttentionCases.length} Kasus
                </span>
              )}
            </div>

            {needsAttentionCases.length > 0 ? (
              <div className="space-y-2">
                {needsAttentionCases.map((item) => (
                  <CaseCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Check}
                title="Semua aman! Tidak ada kasus kritis atau overdue."
                description="Bagus! Seluruh kasus prioritas tinggi sudah tertangani sesuai target SLA."
                compact
                className="bg-emerald-50/20 border-emerald-100"
              />
            )}
          </section>

          {/* Tugas Saya */}
          <section>
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                <h2 className="text-xs font-extrabold uppercase tracking-wide text-slate-900">
                  Tugas Ditugaskan ke Anda
                </h2>
              </div>
              {myTasksCases.length > 0 && (
                <span className="text-[10.5px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/60">
                  {myTasksCases.length} Tugas
                </span>
              )}
            </div>

            {myTasksCases.length > 0 ? (
              <div className="space-y-2">
                {myTasksCases.map((item) => (
                  <CaseCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={ClipboardCheck}
                title="Belum ada tugas aktif untuk Anda"
                description="Saat kasus baru ditugaskan kepada Anda, kasus tersebut akan muncul di sini."
                compact
              />
            )}
          </section>
        </div>

        {/* Right Column (5 cols): Recent Cases */}
        <div className="lg:col-span-5 space-y-4 sm:space-y-4.5">
          <section>
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <h2 className="text-xs font-extrabold uppercase tracking-wide text-slate-900">
                  Kasus Terbaru
                </h2>
              </div>
              <Link
                href="/cases"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
              >
                <span>Lihat Semua</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentCases.length > 0 ? (
              <div className="space-y-2">
                {recentCases.map((item) => (
                  <CaseCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={FolderOpen}
                title="Belum ada kasus tercatat"
                description="Mulai catat insiden atau kendala operasional pertama di gudang ini."
                compact
                action={
                  <Link
                    href="/cases/new"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Laporkan Kasus</span>
                  </Link>
                }
              />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
