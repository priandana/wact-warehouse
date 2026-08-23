'use client';
// app/(auth)/login/LoginForm.tsx
// Email + password login form

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

interface LoginFormProps {
  redirectTo: string;
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

      if (authError) {
        setError('Email atau password salah. Silakan coba lagi.');
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch {
      setError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Email */}
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-[--color-text-primary]">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-[--color-border] text-sm
                     focus:outline-none focus:ring-2 focus:ring-[--color-primary]/30 focus:border-[--color-primary]
                     placeholder:text-[--color-text-disabled] transition-colors"
          placeholder="nama@perusahaan.com"
          disabled={loading}
        />
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="block text-sm font-medium text-[--color-text-primary]">
            Password
          </label>
          <a href="/forgot-password" className="text-xs text-[--color-primary] hover:underline">
            Lupa password?
          </a>
        </div>
        <div className="relative">
          <input
            id="password"
            type={showPw ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 pr-12 rounded-xl border border-[--color-border] text-sm
                       focus:outline-none focus:ring-2 focus:ring-[--color-primary]/30 focus:border-[--color-primary]
                       placeholder:text-[--color-text-disabled] transition-colors"
            placeholder="Password"
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[--color-text-disabled] hover:text-[--color-text-secondary]"
            tabIndex={-1}
            aria-label={showPw ? 'Sembunyikan password' : 'Tampilkan password'}
          >
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-xl bg-[--color-danger-light] text-sm text-[--color-danger]">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl bg-[--color-primary] text-white text-sm font-semibold
                   hover:bg-[--color-primary-dark] active:scale-[0.98] transition-all
                   disabled:opacity-60 disabled:cursor-not-allowed
                   flex items-center justify-center gap-2 touch-target"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Masuk...
          </>
        ) : (
          'Masuk'
        )}
      </button>
    </form>
  );
}
