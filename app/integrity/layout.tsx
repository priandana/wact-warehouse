// app/integrity/layout.tsx
// Public Integrity Center Layout (Isolated from internal AppShell)
// Zero session dependency, executive compliance styling with Light & Dark theme support.

import Link from 'next/link';
import { Shield, ShieldAlert, Search, ArrowLeft, Lock, CheckCircle2 } from 'lucide-react';
import { IntegrityThemeToggle } from '@/components/integrity/IntegrityThemeToggle';

export const metadata = {
  title: 'WACT Integrity Center — Saluran Pengaduan Anonim & Terpercaya',
  description: 'Pusat pengaduan pelanggaran integritas operasional gudang secara 100% anonim dan terpercaya.',
};

export default function IntegrityPublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white transition-colors duration-200">
      {/* Background Ambient Blueprint Glow & Subtle Grid */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.08),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(99,102,241,0.06),transparent_50%)] dark:bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.15),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(99,102,241,0.12),transparent_50%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-30 dark:opacity-60" />

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/85 dark:bg-slate-950/85 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800/80 shadow-xs transition-colors duration-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Integrity Brand */}
          <div className="flex items-center gap-3">
            <Link
              href="/integrity/report"
              className="flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-xl"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 shrink-0 ring-1 ring-white/20 group-hover:scale-105 transition-transform">
                <Shield className="w-4.5 h-4.5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white">
                    WACT
                  </span>
                  <span className="text-[9.5px] font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-200 dark:border-blue-400/30 uppercase">
                    Integrity
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Saluran Pengaduan Anonim
                </span>
              </div>
            </Link>
          </div>

          {/* Right Actions: Switcher, Theme Toggle & Staff Link */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Nav Switcher: Report vs Track */}
            <div className="flex items-center p-1 bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl">
              <Link
                href="/integrity/report"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-all shadow-xs"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="hidden sm:inline">Lapor Anonim</span>
                <span className="sm:hidden">Lapor</span>
              </Link>
              <Link
                href="/integrity/track"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-all shadow-xs"
              >
                <Search className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">Cek Status</span>
                <span className="sm:hidden">Status</span>
              </Link>
            </div>

            {/* Light / Dark Mode Toggle */}
            <IntegrityThemeToggle />

            {/* Portal Staff Backlink */}
            <Link
              href="/login"
              referrerPolicy="no-referrer"
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-all flex items-center gap-1.5 text-xs font-semibold"
              title="Kembali ke Halaman Login WACT"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden md:inline">Portal Staff</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="relative z-10 flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {children}
      </main>

      {/* Bottom Compliance & Privacy Footer */}
      <footer className="relative z-10 border-t border-slate-200/90 dark:border-slate-900/80 bg-white/70 dark:bg-slate-950/60 backdrop-blur-xs py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <Lock className="w-3 h-3" />
            </div>
            <span>Identitas pelapor <strong>100% aman</strong> & tidak disimpan oleh sistem WACT.</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-500">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-blue-500" /> ISO 37002 Whistleblowing System
            </span>
            <span>&copy; 2026 WACT Enterprise Integrity Center</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
