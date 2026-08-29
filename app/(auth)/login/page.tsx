// app/(auth)/login/page.tsx
// Premium Enterprise Command Center Login View for WACT Warehouse
// Full-Viewport Layout (100dvh) with zero root body scrolling, animated operational stepper, and responsive auth surface

import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { LoginForm } from './LoginForm';
import {
  Package,
  Clock,
  CheckCircle2,
  Building2,
  Sparkles,
  AlertCircle,
  Activity,
} from 'lucide-react';

interface Props {
  searchParams: Promise<{ next?: string; error?: string; logged_out?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const params = await searchParams;

  // If already logged in, redirect
  if (user) {
    redirect(params.next ?? '/dashboard');
  }

  const getErrorMessage = () => {
    switch (params.error) {
      case 'account_inactive':
        return 'Akun Anda dinonaktifkan. Silakan hubungi administrator sistem.';
      case 'profile_not_found':
        return 'Profil pengguna tidak ditemukan di database. Hubungi administrator.';
      case 'profile_error':
        return 'Terjadi kendala saat memuat profil akun. Silakan coba login kembali.';
      case 'no_warehouse_access':
        return 'Akun Anda belum memiliki akses gudang aktif. Hubungi Koordinator.';
      default:
        return null;
    }
  };

  const errorMessage = getErrorMessage();
  const isLoggedOut = params.logged_out === 'true';

  return (
    <div className="h-dvh min-h-[100dvh] w-full flex bg-[#F8FAFC] overflow-hidden">
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* LEFT COLUMN: BRANDING & OPERATIONAL COMMAND CENTER (DESKTOP >= 1024)*/}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[56%] xl:w-[58%] 2xl:w-[60%] h-full relative bg-slate-950 text-white flex-col justify-between p-6 xl:p-8 2xl:p-12 overflow-hidden select-none shrink-0 border-r border-slate-800/60">
        {/* Subtle Ambient Radial Glows & Blueprint Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.28),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(99,102,241,0.22),transparent_50%)] animate-ambient-glow pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0c_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-80" />

        {/* Ambient Top Glow Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />

        {/* ── 1. Top Branding Header ──────────────────────────────────────── */}
        <div className="relative z-10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 xl:w-11 xl:h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 shrink-0 ring-1 ring-white/20">
              <Package className="w-5 h-5 xl:w-6 xl:h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg xl:text-xl font-black tracking-tight text-white">WACT</span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Warehouse Action & Case Tracker</p>
            </div>
          </div>

          <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-300 text-xs font-semibold">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span>Command Center</span>
          </div>
        </div>

        {/* ── 2. Center Hero Content & Visual Workflow ─────────────────────── */}
        <div className="relative z-10 my-auto py-2 xl:py-4 space-y-3.5 xl:space-y-4.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/25 text-xs font-bold text-blue-300 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Warehouse Incident Command Center</span>
          </div>

          <h2 className="text-2xl xl:text-3xl 2xl:text-[2.2rem] font-black tracking-tight text-white leading-snug">
            Operational Excellence & Real-Time Incident Control.
          </h2>

          <p className="text-xs xl:text-sm text-slate-300 font-normal leading-relaxed">
            Sistem terintegrasi pelacakan insiden gudang, penugasan teknisi PIC, dan verifikasi kualitas dengan pemantauan SLA otomatis 24/7.
          </p>

          {/* Operational Workflow Lifecycle Stepper Visual */}
          <div className="p-3.5 xl:p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md space-y-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                Alur Kerja Kasus Operasional
              </span>
              <span className="text-slate-400 font-mono text-[10.5px]">End-to-End Resolution</span>
            </div>

            {/* Stepper Progress Track */}
            <div className="relative">
              {/* Connector line with animated beam flow */}
              <div className="absolute top-3 left-4 right-4 h-0.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="w-full h-full bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-beam-flow" />
              </div>

              <div className="grid grid-cols-5 gap-1 relative z-10">
                {[
                  { step: '1', label: 'Dilaporkan', color: 'bg-blue-500 text-white ring-blue-400/30' },
                  { step: '2', label: 'Penugasan', color: 'bg-indigo-500 text-white ring-indigo-400/30' },
                  { step: '3', label: 'Pengerjaan', color: 'bg-amber-500 text-white ring-amber-400/30' },
                  { step: '4', label: 'Verifikasi QC', color: 'bg-purple-500 text-white ring-purple-400/30' },
                  { step: '5', label: 'Selesai', color: 'bg-emerald-500 text-white ring-emerald-400/30' },
                ].map((item) => (
                  <div key={item.step} className="flex flex-col items-center text-center space-y-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shadow-md ring-4 ${item.color}`}>
                      {item.step}
                    </div>
                    <span className="text-[10px] font-bold text-slate-300 leading-tight truncate max-w-full px-0.5">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3 Compact Command Center Pillar Cards */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-2.5 xl:gap-3 pt-0.5">
            {/* Pillar 1: Live SLA Monitoring */}
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-blue-500/40 hover:bg-white/[0.05] transition-all duration-300 flex items-start gap-2.5 group">
              <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-400/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-white truncate">Live SLA Monitoring</h3>
                <p className="text-[10.5px] text-slate-400 leading-snug mt-0.5">
                  Eskalasi bertingkat 1 jam s/d 72 jam cegah bottleneck.
                </p>
              </div>
            </div>

            {/* Pillar 2: Closed-Loop Verification */}
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-emerald-500/40 hover:bg-white/[0.05] transition-all duration-300 flex items-start gap-2.5 group">
              <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-white truncate">Closed-Loop QC</h3>
                <p className="text-[10.5px] text-slate-400 leading-snug mt-0.5">
                  Validasi ganda foto bukti Sebelum & Sesudah perbaikan.
                </p>
              </div>
            </div>

            {/* Pillar 3: Multi-Warehouse Isolation */}
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-indigo-500/40 hover:bg-white/[0.05] transition-all duration-300 flex items-start gap-2.5 group">
              <div className="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-400/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-white truncate">Multi-Warehouse</h3>
                <p className="text-[10.5px] text-slate-400 leading-snug mt-0.5">
                  Isolasi data ketat BDG & PDL berbasis Role & RLS.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── 3. Bottom Status Ticker ─────────────────────────────────────── */}
        <div className="relative z-10 pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-slate-300">Sistem Operasional Aktif</span>
          </div>
          <span className="font-mono text-[11px] text-slate-500">v2.4 • Bandung & Padalarang Hubs</span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* RIGHT COLUMN: LOGIN AUTH SURFACE (RESPONSIVE & TOUCH-FRIENDLY)    */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 h-full min-h-[100dvh] lg:min-h-0 flex flex-col justify-between items-center p-4 sm:p-6 lg:p-8 xl:p-12 relative overflow-y-auto overflow-x-hidden">
        {/* Subtle Ambient Background Glow on Auth Side */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl pointer-events-none" />

        {/* Mobile Header Branding (< 1024px) */}
        <div className="lg:hidden w-full max-w-md pt-2 pb-0 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <Package className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black tracking-tight text-slate-900">WACT</span>
                <span className="text-[9.5px] font-black px-1.5 py-0.2 rounded bg-blue-50 text-blue-700">PRO</span>
              </div>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            Internal App
          </span>
        </div>

        {/* Centered Login Card */}
        <div className="w-full max-w-md my-auto pt-2 pb-3 sm:py-6 flex flex-col justify-center">
          <div className="bg-white rounded-[26px] border border-slate-200/80 shadow-[0_20px_50px_rgba(15,23,42,0.06)] p-6 sm:p-8 space-y-5 sm:space-y-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                Selamat Datang Kembali 👋
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                Masuk untuk mengakses portal operasional warehouse Anda.
              </p>
            </div>

            {/* Successful Logout Feedback */}
            {isLoggedOut && !errorMessage && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-xs font-semibold text-emerald-800 flex items-start gap-2.5 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold text-emerald-900">Berhasil keluar</p>
                  <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                    Anda telah keluar dari WACT dengan aman.
                  </p>
                </div>
              </div>
            )}

            {/* Error Message Feedback */}
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-xs font-semibold text-rose-700 flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Main Interactive Login Form */}
            <LoginForm redirectTo={params.next ?? '/dashboard'} />
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="w-full max-w-md pb-2 pt-1 text-center shrink-0">
          <p className="text-xs text-slate-400 font-medium">
            &copy; 2026 WACT &bull; Warehouse Action & Case Tracker System
          </p>
        </div>
      </div>
    </div>
  );
}
