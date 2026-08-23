'use client';
// components/dashboard/HomeDashboard.tsx
// Consumer-Grade / Fintech Inspired Warehouse Operations Dashboard

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
    <div className="space-y-5 pb-6">
      {/* ── 1. Integrated Hero Greeting (Clean & Compact) ────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 pb-1">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 mb-0.5">
            <Sparkles className="w-3 h-3 text-blue-600" />
            <span>{currentDateFormatted}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {getGreeting()}, <span className="text-blue-600">{firstName}</span> 👋
          </h1>
        </div>

        {activeWarehouse && (
          <div className="self-start sm:self-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200/80 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
            <span className="text-xs font-extrabold text-slate-900">{activeWarehouse.warehouseCode}</span>
            <span className="text-xs text-slate-500 font-medium truncate max-w-[150px]">
              {activeWarehouse.warehouseName}
            </span>
          </div>
        )}
      </div>

      {/* ── 2. Compact Fintech KPI Metrics ───────────────────────────────── */}
      <section aria-label="Status Kasus">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Open */}
          <Link
            href="/cases?status=open"
            className="p-3.5 rounded-2xl bg-white border border-slate-200/60 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.03)] hover:shadow-md hover:border-blue-200 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Open</span>
              <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <FolderOpen className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{stats.openCount}</p>
            <p className="text-[10px] font-bold text-blue-600 mt-0.5">Kasus baru</p>
          </Link>

          {/* On Progress */}
          <Link
            href="/cases?status=on_progress"
            className="p-3.5 rounded-2xl bg-white border border-slate-200/60 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.03)] hover:shadow-md hover:border-purple-200 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">On Progress</span>
              <div className="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{stats.onProgressCount}</p>
            <p className="text-[10px] font-bold text-purple-600 mt-0.5">Dikerjakan</p>
          </Link>

          {/* Overdue (Highlighted Alert) */}
          <Link
            href="/cases?status=overdue"
            className="p-3.5 rounded-2xl bg-white border border-rose-100 shadow-[0_2px_8px_-2px_rgba(239,68,68,0.06)] hover:shadow-md hover:border-rose-300 active:scale-[0.98] transition-all relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">Overdue</span>
              <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight">{stats.overdueCount}</p>
            <p className="text-[10px] font-extrabold text-rose-500 mt-0.5">Melewati SLA</p>
          </Link>

          {/* Closed Today */}
          <Link
            href="/cases?status=closed"
            className="p-3.5 rounded-2xl bg-white border border-slate-200/60 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.03)] hover:shadow-md hover:border-emerald-200 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Selesai Hari Ini</span>
              <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{stats.closedTodayCount}</p>
            <p className="text-[10px] font-bold text-emerald-600 mt-0.5">Terverifikasi</p>
          </Link>
        </div>
      </section>

      {/* ── 3. Quick Action Shortcuts (Consumer App Style) ───────────────── */}
      <section aria-label="Aksi Cepat">
        <h2 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2 px-1">
          Aksi Cepat
        </h2>
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {/* 1. Laporkan Kasus (Primary Gradient Action) */}
          <Link
            href="/cases/new"
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 active:scale-95 transition-all text-center group"
          >
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
              <Plus className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <span className="text-[11px] font-bold leading-tight">Laporkan</span>
          </Link>

          {/* 2. Scan QR */}
          <Link
            href="/assets"
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-slate-200/70 shadow-2xs hover:border-slate-300 active:scale-95 transition-all text-center group"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
              <QrCode className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-slate-700 leading-tight">Scan QR</span>
          </Link>

          {/* 3. QC Check */}
          <Link
            href="/inspections"
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-slate-200/70 shadow-2xs hover:border-slate-300 active:scale-95 transition-all text-center group"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
              <ClipboardCheck className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-slate-700 leading-tight">Inspeksi</span>
          </Link>

          {/* 4. Tugas Saya */}
          <Link
            href="/my-tasks"
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-slate-200/70 shadow-2xs hover:border-slate-300 active:scale-95 transition-all text-center group"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
              <UserCheck className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-slate-700 leading-tight">Tugasku</span>
          </Link>
        </div>
      </section>

      {/* ── 4. Main Feeds Section (Desktop 2-Col / Mobile Stack) ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (7 cols): Needs Attention & My Tasks */}
        <div className="lg:col-span-7 space-y-5">
          {/* Perlu Perhatian Segera */}
          <section>
            <div className="flex items-center justify-between mb-2.5 px-1">
              <div className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-rose-500 fill-rose-500" />
                <h2 className="text-xs font-extrabold uppercase tracking-wide text-slate-900">
                  Perlu Perhatian Segera
                </h2>
              </div>
              {needsAttentionCases.length > 0 && (
                <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                  {needsAttentionCases.length} Kasus
                </span>
              )}
            </div>

            {needsAttentionCases.length > 0 ? (
              <div className="space-y-2.5">
                {needsAttentionCases.map((item) => (
                  <CaseCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Check}
                title="Semua aman! Tidak ada kasus kritis atau overdue."
                description="Bagus! Seluruh kasus prioritas tinggi sudah tertangani sesuai target SLA."
                className="py-6 bg-emerald-50/30 border-emerald-100"
              />
            )}
          </section>

          {/* Tugas Saya */}
          <section>
            <div className="flex items-center justify-between mb-2.5 px-1">
              <div className="flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <h2 className="text-xs font-extrabold uppercase tracking-wide text-slate-900">
                  Tugas Ditugaskan ke Anda
                </h2>
              </div>
              {myTasksCases.length > 0 && (
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
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
                className="py-6"
              />
            )}
          </section>
        </div>

        {/* Right Column (5 cols): Recent Cases */}
        <div className="lg:col-span-5 space-y-5">
          <section>
            <div className="flex items-center justify-between mb-2.5 px-1">
              <h2 className="text-xs font-extrabold uppercase tracking-wide text-slate-900">
                Kasus Terbaru
              </h2>
              <Link
                href="/cases"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
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
                action={
                  <Link
                    href="/cases/new"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Laporkan Kasus</span>
                  </Link>
                }
                className="py-6"
              />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
