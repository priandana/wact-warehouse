// app/(auth)/login/page.tsx
// Vibrant Enterprise Command Center Login View for WACT Warehouse
// Fully responsive across Desktop (PC) & Mobile (HP) with dynamic greeting, theme toggle, and rich warehouse hero visual

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { LoginForm } from './LoginForm';
import { LoginThemeToggle } from '@/components/auth/LoginThemeToggle';
import {
  Package,
  Clock,
  CheckCircle2,
  Building2,
  Sparkles,
  AlertCircle,
  Activity,
  Shield,
  Zap,
  Camera,
  Quote,
  Layers,
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
    <div className="min-h-[100dvh] w-full flex flex-col lg:flex-row bg-[#EEF2F7] dark:bg-[#0D1322] overflow-x-hidden selection:bg-blue-600 selection:text-white">
      {/* Inline Theme Initializer to prevent flash on login */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var saved = localStorage.getItem('wact-theme') || localStorage.getItem('wact-integrity-theme');
                if (saved === 'dark') {
                  document.documentElement.classList.add('dark');
                } else if (saved === 'light') {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            })();
          `,
        }}
      />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MOBILE HEADER BANNER (< 1024px)                                    */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="lg:hidden w-full bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 text-white pt-5 pb-8 px-5 rounded-b-[2rem] shadow-lg relative overflow-hidden shrink-0">
        {/* Background Ambient Circles */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-indigo-500/20 blur-xl pointer-events-none" />

        <div className="relative z-10 max-w-md mx-auto space-y-3">
          {/* Top Bar: Brand + Theme Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-md">
                <Package className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-black tracking-tight">WACT</span>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                    PRO
                  </span>
                </div>
                <p className="text-[10px] text-blue-100 font-medium">Warehouse Action & Case Tracker</p>
              </div>
            </div>

            <LoginThemeToggle className="bg-white/15 hover:bg-white/25 border-white/20 text-white shadow-none" />
          </div>

          {/* Punchy Sub-Header on Mobile */}
          <div className="pt-1">
            <h2 className="text-base font-extrabold text-white tracking-tight">
              Kerja Cepat, Kendali Tepat, Gudang Hebat!
            </h2>
            <p className="text-[11px] text-blue-100/90 font-medium mt-0.5 leading-snug">
              Platform cerdas pemantauan insiden dan verifikasi QC gudang.
            </p>
          </div>

          {/* Micro Feature Badges on Mobile */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-xs border border-white/20 text-white">
              <Zap className="w-3 h-3 text-amber-300" />
              SLA 1-72 Jam
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-xs border border-white/20 text-white">
              <Camera className="w-3 h-3 text-emerald-300" />
              Validasi QC
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-xs border border-white/20 text-white">
              <Building2 className="w-3 h-3 text-blue-200" />
              Hub BDG & PDL
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* DESKTOP LEFT COLUMN: VIBRANT WAREHOUSE COMMAND HERO (>= 1024px)     */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[54%] xl:w-[56%] 2xl:w-[58%] h-[100dvh] relative bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-900 dark:from-[#0B132B] dark:via-[#0F1E3D] dark:to-[#070D1E] text-white flex-col justify-between p-8 xl:p-10 2xl:p-12 overflow-hidden select-none shrink-0 border-r border-blue-500/20 dark:border-slate-800/60">
        {/* Decorative Fluid Radial Glows & Dot Matrix */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/20 dark:bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff15_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-70" />

        {/* ── 1. Top Branding Header ──────────────────────────────────────── */}
        <div className="relative z-10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 xl:w-12 xl:h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shadow-xl shadow-blue-900/30 shrink-0 ring-1 ring-white/20">
              <Package className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-white">WACT</span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30 backdrop-blur-xs">
                  PRO v2.4
                </span>
              </div>
              <p className="text-[11px] text-blue-100 dark:text-slate-400 font-medium">
                Warehouse Action & Case Tracker
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 text-white text-xs font-semibold backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Sistem Operasional Aktif</span>
          </div>
        </div>

        {/* ── 2. Center Hero: Content & 3D Tech Card Scene ────────────────── */}
        <div className="relative z-10 my-auto py-4 space-y-5 max-w-2xl">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 dark:bg-blue-500/20 border border-white/25 dark:border-blue-400/30 text-xs font-bold text-white shadow-sm backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Smart Warehouse Incident & QC Platform</span>
          </div>

          {/* Main Headline */}
          <h2 className="text-2xl xl:text-3xl 2xl:text-4xl font-black tracking-tight text-white leading-tight">
            Kerja Cepat, Kendali Tepat, Gudang Hebat!
          </h2>

          <p className="text-xs xl:text-sm text-blue-100 dark:text-slate-300 font-normal leading-relaxed max-w-xl">
            Platform komprehensif pelacakan insiden gudang, delegasi PIC otomatis, dan verifikasi kualitas standar QC untuk efisiensi operasional tanpa henti.
          </p>

          {/* 3 Colored Value-Prop Badge Pills */}
          <div className="grid grid-cols-1 gap-2.5 pt-1">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/10 dark:bg-white/[0.04] border border-white/20 dark:border-white/[0.08] backdrop-blur-md hover:bg-white/15 transition-colors">
              <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center text-amber-300 shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-white">Deteksi & Lapor Insiden Kilat</p>
                <p className="text-[11px] text-blue-100/80 dark:text-slate-400">
                  Lapor kendala fasilitas, alat, atau operasional gudang dalam hitungan detik.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/10 dark:bg-white/[0.04] border border-white/20 dark:border-white/[0.08] backdrop-blur-md hover:bg-white/15 transition-colors">
              <div className="w-8 h-8 rounded-xl bg-emerald-400/20 border border-emerald-300/30 flex items-center justify-center text-emerald-300 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-white">SLA Bertingkat 1 s/d 72 Jam</p>
                <p className="text-[11px] text-blue-100/80 dark:text-slate-400">
                  Eskalasi otomatis cegah keterlambatan picking, loading, dan alur barang.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/10 dark:bg-white/[0.04] border border-white/20 dark:border-white/[0.08] backdrop-blur-md hover:bg-white/15 transition-colors">
              <div className="w-8 h-8 rounded-xl bg-cyan-400/20 border border-cyan-300/30 flex items-center justify-center text-cyan-300 shrink-0">
                <Camera className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-white">Verifikasi Closed-Loop QC</p>
                <p className="text-[11px] text-blue-100/80 dark:text-slate-400">
                  Validasi ganda foto bukti Sebelum & Sesudah penanganan kasus oleh PIC.
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Tech Hub Floating Preview */}
          <div className="p-3.5 xl:p-4 rounded-2xl bg-white/15 dark:bg-slate-900/60 border border-white/25 dark:border-slate-800 backdrop-blur-md shadow-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white shrink-0 shadow-md">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold text-white">Multi-Warehouse Hub</span>
                  <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                    Live
                  </span>
                </div>
                <p className="text-[11px] text-blue-100/80 dark:text-slate-400 truncate">
                  Unit Operasional Bandung (BDG) & Padalarang (PDL)
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200 dark:text-slate-400 block">
                SLA Kecepatan
              </span>
              <span className="text-sm font-black text-emerald-300 font-mono">
                &lt; 15 Menit
              </span>
            </div>
          </div>
        </div>

        {/* ── 3. Bottom Motivational Quote ───────────────────────────────── */}
        <div className="relative z-10 pt-3 border-t border-white/20 dark:border-white/10 flex items-center justify-between text-xs text-blue-100 dark:text-slate-400 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Quote className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <p className="text-[11px] italic truncate">
              &ldquo;Disiplin dan ketelitian hari ini adalah kelancaran pengiriman hari esok.&rdquo;
            </p>
          </div>
          <span className="font-mono text-[10.5px] text-blue-200 dark:text-slate-500 shrink-0 ml-2">
            WACT &bull; 2026
          </span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* RIGHT COLUMN: LOGIN AUTH SURFACE (RESPONSIVE PC & HP)             */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col justify-between items-center p-4 sm:p-6 lg:p-8 xl:p-12 relative overflow-y-auto overflow-x-hidden min-h-[calc(100dvh-180px)] lg:min-h-[100dvh]">
        {/* Subtle Ambient Radial Glow on Auth Side */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 dark:bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

        {/* Desktop Top Bar: Theme Toggle */}
        <div className="hidden lg:flex w-full max-w-md justify-end items-center pb-2 shrink-0">
          <LoginThemeToggle />
        </div>

        {/* Centered Login Card */}
        <div className="w-full max-w-md my-auto pt-1 sm:pt-4 pb-4 sm:py-6 flex flex-col justify-center">
          <div className="neu-raised rounded-3xl p-6 sm:p-8 space-y-5 sm:space-y-6 shadow-xl relative -mt-3 lg:mt-0">
            {/* Successful Logout Feedback */}
            {isLoggedOut && !errorMessage && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-black text-emerald-900 dark:text-emerald-200">Berhasil keluar</p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">
                    Anda telah keluar dari WACT dengan aman.
                  </p>
                </div>
              </div>
            )}

            {/* Error Message Feedback */}
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-700 dark:text-rose-400 flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Main Interactive Login Form (with Dynamic Greeting & Role Selector) */}
            <LoginForm redirectTo={params.next ?? '/dashboard'} />

            {/* Discreet Anonymous Reporting Link */}
            <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/80 text-center">
              <Link
                href="/integrity/report"
                referrerPolicy="no-referrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-1.5 px-3 rounded-xl hover:bg-slate-500/10"
              >
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                <span>Lapor Pelanggaran Secara Anonim</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="w-full max-w-md pb-2 pt-2 text-center shrink-0">
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            &copy; 2026 WACT &bull; Warehouse Action & Case Tracker System
          </p>
        </div>
      </div>
    </div>
  );
}
