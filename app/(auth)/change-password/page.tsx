// app/(auth)/change-password/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, KeyRound, Lock, AlertCircle, CheckCircle2, ArrowRight, LogOut, Loader2 } from 'lucide-react';
import { completeInitialPasswordChangeAction } from '@/app/actions/users';
import { createClient } from '@/lib/supabase/client';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError('Password minimal harus terdiri dari 8 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password tidak cocok dengan password baru.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await completeInitialPasswordChangeAction({
        newPassword,
        confirmPassword,
      });

      if (!res.success) {
        setError(res.error || 'Gagal memperbarui password.');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem.');
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#EEF2F7] dark:bg-[#0D1322] flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      <div className="w-full max-w-md">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-[#EEF2F7] dark:bg-[#131C31] neu-raised text-amber-600 dark:text-amber-400 mb-4 border border-black/[0.04] dark:border-white/[0.05]">
            <KeyRound className="w-7 h-7" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
            Wajib Ganti Password Awal
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1.5">
            Demi keamanan akun Anda, silakan buat password baru sebelum mengakses sistem.
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-[#EEF2F7] dark:bg-[#131C31] rounded-3xl border border-black/[0.04] dark:border-white/[0.05] neu-raised p-6 sm:p-8 relative overflow-hidden">
          {/* Security Banner */}
          <div className="p-4 rounded-2xl bg-[#EEF2F7] dark:bg-[#101726] neu-inset-sm border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-3 mb-5 leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-black">Keamanan Akun:</span> Password sementara yang diberikan oleh Administrator telah dinonaktifkan untuk penggunaan rutin.
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2.5 mb-5 neu-inset-sm animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {success ? (
            <div className="py-6 text-center space-y-3 animate-in zoom-in-95">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 neu-inset-sm flex items-center justify-center mx-auto border border-emerald-500/20">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-black text-slate-800 dark:text-slate-100">Password Berhasil Diperbarui!</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Mengarahkan Anda ke Dashboard WACT...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Password Baru <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 8 karakter"
                    required
                    disabled={loading}
                    className="w-full px-4 py-3 rounded-2xl bg-[#EEF2F7] dark:bg-[#101726] border border-black/[0.04] dark:border-white/[0.05] text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 fintech-input neu-inset transition-all pr-24"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                  >
                    {showPassword ? 'Sembunyikan' : 'Lihat'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Konfirmasi Password Baru <span className="text-rose-500">*</span>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang password baru"
                  required
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-2xl bg-[#EEF2F7] dark:bg-[#101726] border border-black/[0.04] dark:border-white/[0.05] text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 fintech-input neu-inset transition-all"
                />
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 pt-1">
                <p className="flex items-center gap-1.5 font-medium">
                  <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" /> Gunakan kombinasi huruf besar, huruf kecil, angka & simbol.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 h-12 sm:h-[50px] rounded-2xl font-black text-xs sm:text-sm tracking-wide text-white transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer fintech-btn-primary disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Menyimpan Password...</span>
                  </>
                ) : (
                  <>
                    <span>Simpan & Masuk ke Sistem</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Logout fallback */}
          <div className="mt-6 pt-4 border-t border-black/[0.04] dark:border-white/[0.05] flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Bukan akun Anda?</span>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl neu-btn-secondary text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar (Logout)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
