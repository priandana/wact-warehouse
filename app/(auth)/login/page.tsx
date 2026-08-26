// app/(auth)/login/page.tsx
// Redesigned Fintech/Modern Split-Screen Login View with Electric Blue Branding
// Pure Full-Viewport Layout (100dvh) with zero root body scrolling and responsive form panel

import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { LoginForm } from './LoginForm';
import {
  Package,
  Clock,
  CheckCircle2,
  Building2,
  Sparkles,
  ShieldCheck,
  Zap,
  AlertCircle,
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
      {/* LEFT COLUMN: BRANDING & OPERATIONAL HIGHLIGHTS (DESKTOP >= 1024px) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[50%] xl:w-[54%] 2xl:w-[56%] h-full relative bg-slate-950 text-white flex-col justify-between p-6 xl:p-10 2xl:p-14 overflow-hidden select-none shrink-0">
        {/* Subtle Ambient Radial Glows & Grid Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.22),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(99,102,241,0.18),transparent_50%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-80" />

        {/* Ambient Top Glow Line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

        {/* Top Branding Header */}
        <div className="relative z-10 flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 xl:w-11 xl:h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 shrink-0">
            <Package className="w-5 h-5 xl:w-6 xl:h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg xl:text-xl font-black tracking-tight text-white">WACT</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                ENTERPRISE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Warehouse Action & Case Tracker</p>
          </div>
        </div>

        {/* Center Hero Content */}
        <div className="relative z-10 my-auto py-3 xl:py-6 space-y-3 xl:space-y-5 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-xs font-bold text-blue-300">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Next-Gen Incident Management</span>
          </div>

          <h2 className="text-2xl xl:text-3xl 2xl:text-4xl font-black tracking-tight text-white leading-tight">
            Operational Excellence & Real-Time Incident Control.
          </h2>

          <p className="text-xs xl:text-sm text-slate-300 font-normal leading-relaxed">
            Sistem terintegrasi pelacakan insiden gudang, penugasan teknisi, dan verifikasi kualitas dengan pemantauan SLA otomatis 24/7.
          </p>

          {/* 3 Glassmorphism Feature Highlights */}
          <div className="grid grid-cols-1 gap-2.5 xl:gap-3 pt-1">
            <div className="p-3 xl:p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm flex items-start gap-3">
              <div className="w-7 h-7 xl:w-8 xl:h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Live SLA Tracking & Eskalasi Otomatis</h3>
                <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                  Setiap kasus dipantau berdasarkan tingkat prioritas (1 jam s/d 72 jam) guna meminimalisir bottleneck operasional.
                </p>
              </div>
            </div>

            <div className="p-3 xl:p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm flex items-start gap-3">
              <div className="w-7 h-7 xl:w-8 xl:h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Closed-Loop Verification Workflow</h3>
                <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                  Penanganan terstruktur dari temuan awal, pengerjaan PIC, hingga verifikasi QC dengan validasi bukti foto ganda.
                </p>
              </div>
            </div>

            <div className="p-3 xl:p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm flex items-start gap-3">
              <div className="w-7 h-7 xl:w-8 xl:h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                <Building2 className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Multi-Warehouse Strict Isolation</h3>
                <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                  Pemisahan data gudang dan kontrol hak akses berbasis Role & Capability yang terenkripsi aman di tingkat database.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Footer Info */}
        <div className="relative z-10 pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-slate-300">Sistem Operasional Aktif</span>
          </div>
          <span className="font-mono text-[11px]">v2.4 • Bandung & Padalarang Hubs</span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* RIGHT COLUMN: LOGIN CARD FORM (RESPONSIVE & SCROLL-CONFINED)        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 h-full flex flex-col justify-between items-center p-4 sm:p-6 lg:p-8 xl:p-12 relative overflow-y-auto overflow-x-hidden">
        {/* Subtle Ambient Background Light */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl pointer-events-none" />

        {/* Mobile Header Branding (< 1024px) */}
        <div className="lg:hidden w-full max-w-md pt-2 pb-1 flex items-center justify-between shrink-0">
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
        <div className="w-full max-w-md my-auto py-4 sm:py-6 flex flex-col justify-center">
          <div className="bg-white rounded-[24px] sm:rounded-[28px] border border-slate-200/90 shadow-[0_20px_50px_rgba(15,23,42,0.06)] p-6 sm:p-8 space-y-5 sm:space-y-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                Selamat Datang Kembali 👋
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                Masuk untuk melanjutkan aktivitas warehouse Anda.
              </p>
            </div>

            {/* Successful Logout Feedback */}
            {isLoggedOut && !errorMessage && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-xs font-semibold text-emerald-800 flex items-start gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold text-emerald-900">Berhasil keluar</p>
                  <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                    Anda telah keluar dari WACT dengan aman.
                  </p>
                </div>
              </div>
            )}

            {/* Error message from server */}
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-xs font-semibold text-rose-700 flex items-start gap-2.5">
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
