// app/(auth)/login/page.tsx
// Login page — clean, modern, fintech-grade design

import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { LoginForm } from './LoginForm';
import { Package, ShieldAlert, AlertCircle } from 'lucide-react';

interface Props {
  searchParams: Promise<{ next?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const params = await searchParams;

  // Already logged in
  if (user) {
    redirect(params.next ?? '/dashboard');
  }

  const getErrorMessage = () => {
    switch (params.error) {
      case 'account_inactive':
        return 'Akun Anda dinonaktifkan. Silakan hubungi administrator.';
      case 'profile_not_found':
        return 'Profil pengguna tidak ditemukan di database. Hubungi administrator.';
      case 'profile_error':
        return 'Terjadi kendala saat memuat profil akun. Silakan coba login kembali.';
      case 'no_warehouse_access':
        return 'Akun Anda belum ditugaskan ke gudang aktif. Hubungi Koordinator.';
      default:
        return null;
    }
  };

  const errorMessage = getErrorMessage();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 sm:p-6">
      {/* Brand Header */}
      <div className="mb-6 flex flex-col items-center gap-2.5 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/25">
          <Package className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="flex items-center justify-center gap-1.5">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">WACT</h1>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700">PRO</span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Warehouse Action & Case Tracker</p>
        </div>
      </div>

      {/* Card Form */}
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-[0_4px_25px_-5px_rgba(15,23,42,0.06)] p-6 sm:p-8 border border-slate-200/80">
        <h2 className="text-lg font-bold text-slate-900 mb-0.5">Masuk ke Akun</h2>
        <p className="text-xs text-slate-500 font-medium mb-5">Gunakan email operasional gudang Anda</p>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <LoginForm redirectTo={params.next ?? '/dashboard'} />
      </div>

      <p className="mt-6 text-xs text-slate-400 text-center font-medium">
        © 2026 WACT Internal Warehouse Management System
      </p>
    </div>
  );
}
