'use client';
// app/(auth)/login/LoginForm.tsx
// Modern Consumer/Fintech-grade Login Form with Dynamic Time Greeting, Role Tabs, and Anti Double-Click

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  HelpCircle,
  CheckCircle2,
  X,
  Wrench,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface LoginFormProps {
  redirectTo: string;
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [activeRole, setActiveRole] = useState<'admin' | 'field'>('admin');

  // Dynamic Time-of-Day Greeting (Client side to prevent hydration mismatch)
  const [greeting, setGreeting] = useState<{ text: string; icon: string }>({
    text: 'Selamat Datang!',
    icon: '👋',
  });

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) {
      setGreeting({ text: 'Selamat Pagi!', icon: '🌅' });
    } else if (hour >= 11 && hour < 15) {
      setGreeting({ text: 'Selamat Siang!', icon: '☀️' });
    } else if (hour >= 15 && hour < 18) {
      setGreeting({ text: 'Selamat Sore!', icon: '☕' });
    } else {
      setGreeting({ text: 'Selamat Malam!', icon: '🌙' });
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return; // Prevent double submit

    setErrorMessage(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        if (authError.message.toLowerCase().includes('invalid login credentials')) {
          setErrorMessage('Email atau password salah. Silakan periksa kembali.');
        } else {
          setErrorMessage(authError.message || 'Gagal masuk. Silakan coba lagi.');
        }
        setLoading(false);
        return;
      }

      if (data?.session) {
        // Success redirect
        router.push(redirectTo);
        router.refresh();
      } else {
        setErrorMessage('Sesi autentikasi tidak valid.');
        setLoading(false);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Terjadi kesalahan sistem.');
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* ── 1. Dynamic Greeting Header ───────────────────────────────────── */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
            {greeting.text} {greeting.icon}
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
          Masuk ke konsol kontrol operasional warehouse Anda.
        </p>
      </div>

      {/* ── 2. Role Context Tabs ─────────────────────────────────────────── */}
      <div className="p-1 rounded-2xl bg-slate-200/60 dark:bg-slate-900/80 border border-slate-300/40 dark:border-slate-800/80 grid grid-cols-2 gap-1">
        <button
          type="button"
          onClick={() => setActiveRole('admin')}
          className={cn(
            'py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer',
            activeRole === 'admin'
              ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          )}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Administrator</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveRole('field')}
          className={cn(
            'py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer',
            activeRole === 'field'
              ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          )}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Operasional</span>
        </button>
      </div>

      {/* Role Context Hint */}
      <div className="px-3 py-2 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/30 flex items-center gap-2 text-[11px] text-blue-700 dark:text-blue-300">
        <Sparkles className="w-3.5 h-3.5 shrink-0 text-blue-500" />
        <span>
          {activeRole === 'admin'
            ? 'Akses penuh verifikasi insiden, delegasi PIC, dan audit gudang.'
            : 'Akses teknisi lapangan, pembaruan tiket kasus, dan bukti foto QC.'}
        </span>
      </div>

      {/* ── 3. Main Form ─────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/50 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 leading-snug">{errorMessage}</div>
          </div>
        )}

        {/* Email Input */}
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400"
          >
            Email Akun <span className="text-rose-500">*</span>
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors">
              <Mail className="w-4 h-4" />
            </div>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@perusahaan.com"
              className="w-full pl-10 pr-4 h-12 rounded-2xl neu-inset text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-hidden transition-all focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
        </div>

        {/* Password Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400"
            >
              Password <span className="text-rose-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setShowForgotModal(true)}
              className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer"
            >
              Lupa Password?
            </button>
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              disabled={loading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password Anda"
              className="w-full pl-10 pr-11 h-12 rounded-2xl neu-inset text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-hidden transition-all focus:ring-2 focus:ring-blue-500/30"
            />
            <button
              type="button"
              disabled={loading}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              tabIndex={-1}
              aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* ── CRITICAL SUBMIT BUTTON ────────────────────────────────────────── */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className={cn(
              'w-full h-12 sm:h-[50px] rounded-2xl font-black text-xs sm:text-sm tracking-wide text-white transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer fintech-btn-primary group',
              loading && 'opacity-70 cursor-not-allowed pointer-events-none'
            )}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Memproses Verifikasi...</span>
              </>
            ) : (
              <>
                <span>Masuk ke WACT</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>

        {/* Security Footnote */}
        <div className="pt-1 flex items-center justify-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full neu-inset-sm text-[10.5px] font-bold text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Akses Terenkripsi • Multi-Hub BDG & PDL</span>
          </div>
        </div>
      </form>

      {/* ── 4. Forgot Password Dialog ─────────────────────────────────────── */}
      {showForgotModal && (
        <div
          className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowForgotModal(false)}
        >
          <div
            className="w-full max-w-sm bg-[#EEF2F7] dark:bg-[#131C31] neu-raised-lg border border-slate-200/50 dark:border-slate-800/60 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/40 dark:border-slate-800/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl neu-icon-well flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">Bantuan Akses Akun</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="w-8 h-8 rounded-xl neu-icon-well flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                WACT merupakan sistem internal operasional gudang dengan kontrol akses ketat.
              </p>
              <p className="p-3.5 rounded-2xl neu-inset-sm text-blue-900 dark:text-blue-300 font-semibold">
                Untuk reset password atau pemulihan akun, silakan hubungi <strong>Koordinator Gudang</strong> atau <strong>IT/Admin System</strong> cabang Anda.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="w-full fintech-btn-primary py-3 rounded-2xl text-white font-bold text-xs cursor-pointer"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
