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
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { cn } from '@/lib/utils/cn';

export interface DashboardStats {
  openCount: number;
  onProgressCount: number;
  waitingVerificationCount: number;
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
    <div className="space-y-4 sm:space-y-6 pb-6 animate-in fade-in duration-150">
      {/* ── 1. Executive Operational Hero Banner (Neumorphic Raised Large) ── */}
      <div className="bg-[#EEF2F7] dark:bg-[#131C31] rounded-3xl border border-white/80 dark:border-white/5 shadow-[8px_8px_24px_rgba(163,177,198,0.35),-8px_-8px_24px_rgba(255,255,255,0.95)] dark:shadow-[8px_8px_24px_rgba(0,0,0,0.65),-4px_-4px_14px_rgba(255,255,255,0.03)] p-4 sm:p-6 relative overflow-hidden">
        {/* Soft subtle ambient gradient tint */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-blue-100/50 via-indigo-100/20 to-transparent dark:from-blue-900/15 dark:via-indigo-900/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4">
          <div className="space-y-2">
            {/* Shift Date & Operational Status Indicator */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF2F7] dark:bg-[#0D1322] text-slate-700 dark:text-slate-300 font-bold text-[10.5px] sm:text-[11px] shadow-[inset_2px_2px_4px_rgba(163,177,198,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.9)] dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.6),inset_-1px_-1px_3px_rgba(255,255,255,0.03)] border border-slate-300/30 dark:border-slate-800">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>{currentDateFormatted}</span>
              </span>

              {stats.overdueCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50/90 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-extrabold text-[10.5px] sm:text-[11px] shadow-[2px_2px_6px_rgba(244,63,94,0.25),-2px_-2px_6px_rgba(255,255,255,0.9)] dark:shadow-[2px_2px_6px_rgba(0,0,0,0.5),-1px_-1px_3px_rgba(255,255,255,0.03)] border border-rose-200/80 dark:border-rose-800">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0 ring-2 ring-rose-200 dark:ring-rose-900" />
                  <span>Perlu Tindakan SLA ({stats.overdueCount} Overdue)</span>
                </span>
              ) : stats.openCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50/90 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-extrabold text-[10.5px] sm:text-[11px] shadow-[2px_2px_6px_rgba(37,99,235,0.2),-2px_-2px_6px_rgba(255,255,255,0.9)] dark:shadow-[2px_2px_6px_rgba(0,0,0,0.5),-1px_-1px_3px_rgba(255,255,255,0.03)] border border-blue-200/80 dark:border-blue-800">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 ring-2 ring-blue-200 dark:ring-blue-900" />
                  <span>{stats.openCount} Kasus Aktif</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50/90 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-extrabold text-[10.5px] sm:text-[11px] shadow-[2px_2px_6px_rgba(16,185,129,0.2),-2px_-2px_6px_rgba(255,255,255,0.9)] dark:shadow-[2px_2px_6px_rgba(0,0,0,0.5),-1px_-1px_3px_rgba(255,255,255,0.03)] border border-emerald-200/80 dark:border-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 ring-2 ring-emerald-200 dark:ring-emerald-900" />
                  <span>Operasional Normal & Terkendali</span>
                </span>
              )}

              {/* Mobile/Tablet Warehouse Tag */}
              {activeWarehouse && (
                <span className="inline-flex lg:hidden items-center gap-1 px-3 py-1 rounded-full bg-[#EEF2F7] dark:bg-[#131C31] text-blue-700 dark:text-blue-300 font-black text-[10px] shadow-[2px_2px_6px_rgba(163,177,198,0.28),-2px_-2px_6px_rgba(255,255,255,0.9)] dark:shadow-[2px_2px_6px_rgba(0,0,0,0.45),-1px_-1px_3px_rgba(255,255,255,0.03)] border border-white/70 dark:border-white/5">
                  <Building2 className="w-3 h-3 shrink-0" />
                  <span>{activeWarehouse.warehouseCode}</span>
                </span>
              )}
            </div>

            {/* Personalized Greeting */}
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {getGreeting()}, <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{firstName}</span> 👋
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-xl">
              Pusat monitoring aset pergudangan, inspeksi QC harian, dan respons kasus operasional real-time.
            </p>
          </div>

          {/* Desktop Only: Integrated Operational Summary */}
          {activeWarehouse && (
            <div className="hidden lg:flex flex-col items-end text-right justify-center shrink-0 pl-6 border-l border-slate-300/40 dark:border-slate-800">
              <div className="flex items-center gap-2 justify-end">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 ring-4 ring-emerald-200 dark:ring-emerald-950" />
                <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{activeWarehouse.warehouseCode}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate max-w-[160px]">
                  • {activeWarehouse.warehouseName}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2">
                <span className={stats.openCount > 0 ? 'text-blue-600 dark:text-blue-400 font-black' : 'text-slate-600 dark:text-slate-400'}>
                  {stats.openCount} Open
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className={stats.onProgressCount > 0 ? 'text-amber-700 dark:text-amber-400 font-black' : 'text-slate-600 dark:text-slate-400'}>
                  {stats.onProgressCount} Progress
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className={stats.waitingVerificationCount > 0 ? 'text-purple-700 dark:text-purple-400 font-black' : 'text-slate-600 dark:text-slate-400'}>
                  {stats.waitingVerificationCount} QC
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className={stats.overdueCount > 0 ? 'text-rose-600 dark:text-rose-400 font-black' : 'text-emerald-700 dark:text-emerald-400 font-black'}>
                  {stats.overdueCount > 0 ? `${stats.overdueCount} Overdue` : '0 Overdue'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 2. Unified 5-Metric Command Center Row (Neumorphism Lite Raised Cards) ── */}
      <section aria-label="Status Kasus Operasional">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
          {/* 1. Open */}
          <Link
            href="/cases?status=open"
            className="p-4 sm:p-5 rounded-3xl bg-[#EEF2F7] dark:bg-[#131C31] border border-white/80 dark:border-white/5 shadow-[6px_6px_16px_rgba(163,177,198,0.35),-6px_-6px_16px_rgba(255,255,255,0.95)] dark:shadow-[6px_6px_16px_rgba(0,0,0,0.6),-4px_-4px_12px_rgba(255,255,255,0.03)] hover:shadow-[8px_8px_22px_rgba(163,177,198,0.44),-8px_-8px_22px_rgba(255,255,255,1)] dark:hover:shadow-[8px_8px_22px_rgba(0,0,0,0.7),-5px_-5px_14px_rgba(255,255,255,0.04)] hover:-translate-y-1 active:scale-[0.98] transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Open</span>
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white shadow-[3px_3px_8px_rgba(37,99,235,0.35),-2px_-2px_6px_rgba(255,255,255,0.8)] dark:shadow-[3px_3px_8px_rgba(0,0,0,0.5),-2px_-2px_5px_rgba(255,255,255,0.03)] flex items-center justify-center group-hover:scale-110 transition-transform">
                <FolderOpen className="w-4.5 h-4.5" />
              </div>
            </div>
            <p className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none">{stats.openCount}</p>
            <p className="text-xs font-extrabold text-blue-600 dark:text-blue-400 mt-2">Kasus baru</p>
          </Link>

          {/* 2. On Progress */}
          <Link
            href="/cases?status=on_progress"
            className="p-4 sm:p-5 rounded-3xl bg-[#EEF2F7] dark:bg-[#131C31] border border-white/80 dark:border-white/5 shadow-[6px_6px_16px_rgba(163,177,198,0.35),-6px_-6px_16px_rgba(255,255,255,0.95)] dark:shadow-[6px_6px_16px_rgba(0,0,0,0.6),-4px_-4px_12px_rgba(255,255,255,0.03)] hover:shadow-[8px_8px_22px_rgba(163,177,198,0.44),-8px_-8px_22px_rgba(255,255,255,1)] dark:hover:shadow-[8px_8px_22px_rgba(0,0,0,0.7),-5px_-5px_14px_rgba(255,255,255,0.04)] hover:-translate-y-1 active:scale-[0.98] transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">On Progress</span>
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-600 text-white shadow-[3px_3px_8px_rgba(245,158,11,0.35),-2px_-2px_6px_rgba(255,255,255,0.8)] dark:shadow-[3px_3px_8px_rgba(0,0,0,0.5),-2px_-2px_5px_rgba(255,255,255,0.03)] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock className="w-4.5 h-4.5" />
              </div>
            </div>
            <p className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none">{stats.onProgressCount}</p>
            <p className="text-xs font-extrabold text-amber-700 dark:text-amber-400 mt-2">Sedang dikerjakan</p>
          </Link>

          {/* 3. Menunggu Verifikasi QC */}
          <Link
            href="/cases?status=waiting_verification"
            className="p-4 sm:p-5 rounded-3xl bg-[#EEF2F7] dark:bg-[#131C31] border border-white/80 dark:border-white/5 shadow-[6px_6px_16px_rgba(163,177,198,0.35),-6px_-6px_16px_rgba(255,255,255,0.95)] dark:shadow-[6px_6px_16px_rgba(0,0,0,0.6),-4px_-4px_12px_rgba(255,255,255,0.03)] hover:shadow-[8px_8px_22px_rgba(163,177,198,0.44),-8px_-8px_22px_rgba(255,255,255,1)] dark:hover:shadow-[8px_8px_22px_rgba(0,0,0,0.7),-5px_-5px_14px_rgba(255,255,255,0.04)] hover:-translate-y-1 active:scale-[0.98] transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300">Verifikasi QC</span>
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white shadow-[3px_3px_8px_rgba(168,85,247,0.35),-2px_-2px_6px_rgba(255,255,255,0.8)] dark:shadow-[3px_3px_8px_rgba(0,0,0,0.5),-2px_-2px_5px_rgba(255,255,255,0.03)] flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-4.5 h-4.5" />
              </div>
            </div>
            <p className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none">{stats.waitingVerificationCount}</p>
            <p className="text-xs font-extrabold text-purple-700 dark:text-purple-400 mt-2">Awaiting audit</p>
          </Link>

          {/* 4. Overdue (Alert Highlight) */}
          <Link
            href="/cases?status=overdue"
            className={cn(
              'p-4 sm:p-5 rounded-3xl border transition-all group relative overflow-hidden active:scale-[0.98]',
              stats.overdueCount > 0
                ? 'bg-[#EEF2F7] dark:bg-[#131C31] border-rose-300/80 dark:border-rose-900/60 shadow-[6px_6px_18px_rgba(244,63,94,0.22),-6px_-6px_18px_rgba(255,255,255,0.95)] hover:shadow-[8px_8px_24px_rgba(244,63,94,0.3),-8px_-8px_24px_rgba(255,255,255,1)] hover:-translate-y-1'
                : 'bg-[#EEF2F7] dark:bg-[#131C31] border-white/80 dark:border-white/5 shadow-[6px_6px_16px_rgba(163,177,198,0.35),-6px_-6px_16px_rgba(255,255,255,0.95)] hover:shadow-[8px_8px_22px_rgba(163,177,198,0.44),-8px_-8px_22px_rgba(255,255,255,1)] hover:-translate-y-1'
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">Overdue</span>
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-rose-500 to-red-600 text-white shadow-[3px_3px_8px_rgba(244,63,94,0.35),-2px_-2px_6px_rgba(255,255,255,0.8)] dark:shadow-[3px_3px_8px_rgba(0,0,0,0.5),-2px_-2px_5px_rgba(255,255,255,0.03)] flex items-center justify-center group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-4.5 h-4.5" />
              </div>
            </div>
            <p className="text-3xl sm:text-4xl font-black text-rose-600 dark:text-rose-400 tracking-tight leading-none">{stats.overdueCount}</p>
            <p className="text-xs font-extrabold text-rose-600 dark:text-rose-400 mt-2 flex items-center gap-1.5">
              {stats.overdueCount > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0 ring-2 ring-rose-200" />}
              <span>Melewati SLA</span>
            </p>
          </Link>

          {/* 5. Selesai Hari Ini */}
          <Link
            href="/cases?status=closed"
            className="col-span-2 sm:col-span-1 lg:col-span-1 p-4 sm:p-5 rounded-3xl bg-[#EEF2F7] dark:bg-[#131C31] border border-white/80 dark:border-white/5 shadow-[6px_6px_16px_rgba(163,177,198,0.35),-6px_-6px_16px_rgba(255,255,255,0.95)] dark:shadow-[6px_6px_16px_rgba(0,0,0,0.6),-4px_-4px_12px_rgba(255,255,255,0.03)] hover:shadow-[8px_8px_22px_rgba(163,177,198,0.44),-8px_-8px_22px_rgba(255,255,255,1)] dark:hover:shadow-[8px_8px_22px_rgba(0,0,0,0.7),-5px_-5px_14px_rgba(255,255,255,0.04)] hover:-translate-y-1 active:scale-[0.98] transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Selesai Hari Ini</span>
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-400 to-emerald-600 text-white shadow-[3px_3px_8px_rgba(16,185,129,0.35),-2px_-2px_6px_rgba(255,255,255,0.8)] dark:shadow-[3px_3px_8px_rgba(0,0,0,0.5),-2px_-2px_5px_rgba(255,255,255,0.03)] flex items-center justify-center group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between sm:block">
              <p className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none">{stats.closedTodayCount}</p>
              <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">Terverifikasi QC</p>
            </div>
          </Link>
        </div>
      </section>

      {/* ── 3. Quick Action Shortcuts (Neumorphism Lite Raised Controls) ── */}
      <section aria-label="Aksi Cepat">
        <h2 className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 px-1">
          Aksi Cepat
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-3.5">
          {/* 1. Laporkan Kasus */}
          <Link
            href="/cases/new"
            className="flex flex-col items-center justify-center p-3.5 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-[4px_4px_14px_rgba(37,99,235,0.35),-2px_-2px_8px_rgba(255,255,255,0.6)] active:scale-95 transition-all text-center group min-h-[64px]"
          >
            <div className="w-8 h-8 rounded-2xl bg-white/20 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform shadow-inner">
              <Plus className="w-4.5 h-4.5 text-white stroke-[2.5]" />
            </div>
            <span className="text-xs font-extrabold leading-tight">Laporkan</span>
          </Link>

          {/* 2. Scan QR / Aset */}
          <Link
            href="/assets"
            className="flex flex-col items-center justify-center p-3.5 rounded-3xl bg-[#EEF2F7] dark:bg-[#131C31] text-amber-800 dark:text-amber-300 border border-white/80 dark:border-white/5 shadow-[4px_4px_12px_rgba(163,177,198,0.3),-4px_-4px_12px_rgba(255,255,255,0.95)] dark:shadow-[4px_4px_12px_rgba(0,0,0,0.5),-2px_-2px_6px_rgba(255,255,255,0.03)] hover:-translate-y-0.5 active:scale-95 transition-all text-center group min-h-[64px]"
          >
            <div className="w-8 h-8 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform shadow-[2px_2px_5px_rgba(163,177,198,0.25),-2px_-2px_5px_rgba(255,255,255,0.8)] dark:shadow-none">
              <QrCode className="w-4.5 h-4.5" />
            </div>
            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 leading-tight">Scan QR</span>
          </Link>

          {/* 3. QC Check */}
          <Link
            href="/inspections"
            className="flex flex-col items-center justify-center p-3.5 rounded-3xl bg-[#EEF2F7] dark:bg-[#131C31] text-emerald-800 dark:text-emerald-300 border border-white/80 dark:border-white/5 shadow-[4px_4px_12px_rgba(163,177,198,0.3),-4px_-4px_12px_rgba(255,255,255,0.95)] dark:shadow-[4px_4px_12px_rgba(0,0,0,0.5),-2px_-2px_6px_rgba(255,255,255,0.03)] hover:-translate-y-0.5 active:scale-95 transition-all text-center group min-h-[64px]"
          >
            <div className="w-8 h-8 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform shadow-[2px_2px_5px_rgba(163,177,198,0.25),-2px_-2px_5px_rgba(255,255,255,0.8)] dark:shadow-none">
              <ClipboardCheck className="w-4.5 h-4.5" />
            </div>
            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 leading-tight">Inspeksi</span>
          </Link>

          {/* 4. Tugas Saya */}
          <Link
            href="/my-tasks"
            className="flex flex-col items-center justify-center p-3.5 rounded-3xl bg-[#EEF2F7] dark:bg-[#131C31] text-purple-800 dark:text-purple-300 border border-white/80 dark:border-white/5 shadow-[4px_4px_12px_rgba(163,177,198,0.3),-4px_-4px_12px_rgba(255,255,255,0.95)] dark:shadow-[4px_4px_12px_rgba(0,0,0,0.5),-2px_-2px_6px_rgba(255,255,255,0.03)] hover:-translate-y-0.5 active:scale-95 transition-all text-center group min-h-[64px]"
          >
            <div className="w-8 h-8 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform shadow-[2px_2px_5px_rgba(163,177,198,0.25),-2px_-2px_5px_rgba(255,255,255,0.8)] dark:shadow-none">
              <UserCheck className="w-4.5 h-4.5" />
            </div>
            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 leading-tight">Tugasku</span>
          </Link>
        </div>
      </section>

      {/* ── 4. Main Feeds Section (Desktop 2-Col / Mobile Stack) ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        {/* Left Column (7 cols): Needs Attention & My Tasks */}
        <div className="lg:col-span-7 space-y-4 sm:space-y-4.5">
          {/* Perlu Perhatian Segera */}
          <section>
            <div className="flex items-center justify-between mb-2.5 px-1">
              <div className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-rose-500 fill-rose-500" />
                <h2 className="text-xs font-black uppercase tracking-wide text-slate-900 dark:text-white">
                  Perlu Perhatian Segera
                </h2>
              </div>
              {needsAttentionCases.length > 0 && (
                <span className="text-[10.5px] font-extrabold text-rose-700 dark:text-rose-300 bg-[#EEF2F7] dark:bg-[#131C31] px-2.5 py-0.5 rounded-full border border-rose-300/80 dark:border-rose-900 shadow-[inset_1.5px_1.5px_3px_rgba(244,63,94,0.2),inset_-1.5px_-1.5px_3px_rgba(255,255,255,0.8)]">
                  {needsAttentionCases.length} Kasus Membutuhkan Tindakan
                </span>
              )}
            </div>

            {needsAttentionCases.length > 0 ? (
              <div className="p-3 sm:p-3.5 rounded-3xl bg-[#EEF2F7] dark:bg-[#131C31] border border-rose-300/40 dark:border-rose-950 shadow-[6px_6px_16px_rgba(244,63,94,0.12),-6px_-6px_16px_rgba(255,255,255,0.95)] dark:shadow-[6px_6px_16px_rgba(0,0,0,0.5),-3px_-3px_8px_rgba(255,255,255,0.02)] space-y-2.5">
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
                className="bg-[#EEF2F7] dark:bg-[#131C31] border border-emerald-200/50 dark:border-emerald-950 shadow-[4px_4px_12px_rgba(16,185,129,0.1),-4px_-4px_12px_rgba(255,255,255,0.9)]"
              />
            )}
          </section>

          {/* Tugas Saya */}
          <section>
            <div className="flex items-center justify-between mb-2.5 px-1">
              <div className="flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h2 className="text-xs font-black uppercase tracking-wide text-slate-900 dark:text-white">
                  Tugas Ditugaskan ke Anda
                </h2>
              </div>
              {myTasksCases.length > 0 && (
                <span className="text-[10.5px] font-extrabold text-slate-700 dark:text-slate-300 bg-[#EEF2F7] dark:bg-[#131C31] px-2.5 py-0.5 rounded-full border border-white/80 dark:border-white/5 shadow-[inset_1.5px_1.5px_3px_rgba(163,177,198,0.25),inset_-1.5px_-1.5px_3px_rgba(255,255,255,0.85)]">
                  {myTasksCases.length} Tugas
                </span>
              )}
            </div>

            {myTasksCases.length > 0 ? (
              <div className="space-y-2.5">
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
            <div className="flex items-center justify-between mb-2.5 px-1">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <h2 className="text-xs font-black uppercase tracking-wide text-slate-900 dark:text-white">
                  Kasus Terbaru
                </h2>
              </div>
              <Link
                href="/cases"
                className="text-xs font-extrabold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 hover:underline"
              >
                <span>Lihat Semua</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentCases.length > 0 ? (
              <div className="space-y-2.5">
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
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-md shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700 transition-all"
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
