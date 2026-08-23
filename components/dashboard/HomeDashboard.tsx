'use client';
// components/dashboard/HomeDashboard.tsx
// Fintech/Consumer-grade Mobile-First Warehouse Dashboard

import { useActiveWarehouse } from '@/components/shared/layout/AppShellProvider';
import { CaseCard, type CaseCardData } from '@/components/shared/CaseCard';
import { EmptyState } from '@/components/shared/EmptyState';
import Link from 'next/link';
import {
  PlusCircle,
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

  // Dynamic greeting based on current local hour
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const currentDateFormatted = format(new Date(), 'EEEE, d MMMM yyyy', { locale: localeId });

  return (
    <div className="space-y-6 pb-6">
      {/* ── 1. Greeting & Date Header ────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 mb-0.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{currentDateFormatted}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {getGreeting()}, <span className="text-blue-600">{userName.split(' ')[0]}</span> 👋
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Operasional {activeWarehouse ? `${activeWarehouse.warehouseCode} — ${activeWarehouse.warehouseName}` : 'Gudang'}
          </p>
        </div>
      </div>

      {/* ── 2. Compact Fintech-Style Summary Metrics ─────────────────────── */}
      <section aria-label="Ringkasan Status Kasus">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Open */}
          <Link
            href="/cases?status=open"
            className="p-3.5 rounded-2xl bg-white border border-blue-100 shadow-[0_2px_8px_-2px_rgba(37,99,235,0.06)] hover:shadow-md hover:border-blue-300 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600">Open</span>
              <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <FolderOpen className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{stats.openCount}</p>
            <p className="text-[10.5px] font-semibold text-blue-600 mt-0.5">Kasus baru</p>
          </Link>

          {/* On Progress */}
          <Link
            href="/cases?status=on_progress"
            className="p-3.5 rounded-2xl bg-white border border-purple-100 shadow-[0_2px_8px_-2px_rgba(139,92,246,0.06)] hover:shadow-md hover:border-purple-300 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600">On Progress</span>
              <div className="w-7 h-7 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{stats.onProgressCount}</p>
            <p className="text-[10.5px] font-semibold text-purple-600 mt-0.5">Sedang dikerjakan</p>
          </Link>

          {/* Overdue */}
          <Link
            href="/cases?status=overdue"
            className="p-3.5 rounded-2xl bg-white border border-rose-100 shadow-[0_2px_8px_-2px_rgba(239,68,68,0.06)] hover:shadow-md hover:border-rose-300 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600">Overdue</span>
              <div className="w-7 h-7 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-rose-600 tracking-tight">{stats.overdueCount}</p>
            <p className="text-[10.5px] font-bold text-rose-500 mt-0.5">Melewati SLA</p>
          </Link>

          {/* Closed Today */}
          <Link
            href="/cases?status=closed"
            className="p-3.5 rounded-2xl bg-white border border-emerald-100 shadow-[0_2px_8px_-2px_rgba(16,185,129,0.06)] hover:shadow-md hover:border-emerald-300 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600">Closed Hari Ini</span>
              <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{stats.closedTodayCount}</p>
            <p className="text-[10.5px] font-semibold text-emerald-600 mt-0.5">Selesai terverifikasi</p>
          </Link>
        </div>
      </section>

      {/* ── 3. Quick Actions (Consumer App / Fintech Feel) ────────────────── */}
      <section aria-label="Aksi Cepat">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2.5 px-1">
          Aksi Cepat
        </h2>
        <div className="grid grid-cols-4 gap-2.5 sm:gap-4">
          {/* 1. Laporkan Kasus (Primary Highlighted) */}
          <Link
            href="/cases/new"
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 active:scale-95 transition-all text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
              <PlusCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-[11px] font-bold leading-tight">Laporkan Kasus</span>
          </Link>

          {/* 2. Scan QR Aset */}
          <Link
            href="/assets"
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow hover:border-slate-300 active:scale-95 transition-all text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
              <QrCode className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-slate-700 leading-tight">Scan QR</span>
          </Link>

          {/* 3. QC Check */}
          <Link
            href="/inspections"
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow hover:border-slate-300 active:scale-95 transition-all text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-slate-700 leading-tight">QC Check</span>
          </Link>

          {/* 4. Tugas Saya */}
          <Link
            href="/my-tasks"
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow hover:border-slate-300 active:scale-95 transition-all text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
              <UserCheck className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-slate-700 leading-tight">Tugas Saya</span>
          </Link>
        </div>
      </section>

      {/* ── 4. Desktop 2-Column Grid / Mobile Vertical Stack ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Desktop: 7 cols): Needs Attention & My Tasks */}
        <div className="lg:col-span-7 space-y-6">
          {/* Needs Attention Section (Critical / High / Overdue) */}
          <section>
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-900 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-rose-500 fill-rose-500" />
                  Perlu Perhatian Segera
                </h2>
              </div>
              <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                {needsAttentionCases.length} Kasus
              </span>
            </div>

            {needsAttentionCases.length > 0 ? (
              <div className="space-y-3">
                {needsAttentionCases.map((item) => (
                  <CaseCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Check}
                title="Semua aman! Tidak ada kasus kritis atau overdue."
                description="Bagus! Seluruh kasus prioritas tinggi sudah tertangani sesuai SLA."
                className="py-8 bg-emerald-50/40 border-emerald-200/60"
              />
            )}
          </section>

          {/* My Tasks Section */}
          <section>
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-900 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-blue-600" />
                Tugas Ditugaskan ke Anda
              </h2>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {myTasksCases.length} Tugas
              </span>
            </div>

            {myTasksCases.length > 0 ? (
              <div className="space-y-3">
                {myTasksCases.map((item) => (
                  <CaseCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={ClipboardCheck}
                title="Belum ada tugas aktif untuk Anda"
                description="Saat kasus baru ditugaskan kepada Anda oleh Koordinator, kasus tersebut akan muncul di sini."
                className="py-8"
              />
            )}
          </section>
        </div>

        {/* Right Column (Desktop: 5 cols): Recent Cases */}
        <div className="lg:col-span-5 space-y-6">
          <section>
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-900">
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
              <div className="space-y-3">
                {recentCases.map((item) => (
                  <CaseCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={FolderOpen}
                title="Belum ada kasus tercatat"
                description="Mulai catat kejadian atau kerusakan alat pertama di gudang ini."
                action={
                  <Link
                    href="/cases/new"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-sm hover:bg-blue-700 transition-colors"
                  >
                    <PlusCircle className="w-4 h-4" />
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
