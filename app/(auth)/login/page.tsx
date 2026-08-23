// app/(auth)/login/page.tsx
// Login page — clean, mobile-first design

import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { LoginForm } from './LoginForm';

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

  return (
    <div className="min-h-screen bg-[--color-bg] flex flex-col items-center justify-center p-6">
      {/* Logo mark */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-[--color-primary] flex items-center justify-center shadow-lg shadow-blue-200">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[--color-text-primary] tracking-tight">WACT</h1>
          <p className="text-sm text-[--color-text-secondary]">Warehouse Action & Case Tracker</p>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-[--color-text-primary] mb-1">Masuk</h2>
        <p className="text-sm text-[--color-text-secondary] mb-6">Gunakan akun warehouse Anda</p>

        {params.error === 'account_inactive' && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-[--color-danger-light] text-sm text-[--color-danger]">
            Akun Anda dinonaktifkan. Hubungi administrator.
          </div>
        )}

        <LoginForm redirectTo={params.next ?? '/dashboard'} />
      </div>

      <p className="mt-6 text-xs text-[--color-text-disabled] text-center">
        © 2026 WACT Internal System
      </p>
    </div>
  );
}
