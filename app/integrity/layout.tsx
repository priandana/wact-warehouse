// app/integrity/layout.tsx
// Public Integrity Center Layout (Isolated from internal AppShell)
// Zero session dependency, executive compliance styling with Light & Dark theme support.
// Fully optimized for mobile (< 640px) 2-row hierarchy and desktop single-row layout.

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
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white transition-colors duration-150">
      {/* Inline Theme Initializer to prevent flash */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var saved = localStorage.getItem('wact-integrity-theme');
                if (saved === 'dark') {
                  document.documentElement.classList.add('dark');
                } else if (saved === 'light') {
                  document.documentElement.classList.remove('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            })();
          `,
        }}
      />

      {/* Background Ambient Blueprint Glow & Subtle Grid */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.06),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(99,102,241,0.05),transparent_50%)] dark:bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.15),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(99,102,241,0.12),transparent_50%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-25 dark:opacity-60" />

      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800/80 shadow-xs transition-colors duration-150">
        <div className="max-w-5xl mx-auto px-3.5 sm:px-6 py-2.5 sm:py-0 sm:h-16 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4">
          {/* Row 1 on Mobile / Left & Right split on Desktop */}
          <div className="flex items-center justify-between w-full sm:w-auto">
            {/* Logo & Integrity Brand */}
            <Link
              href="/integrity/report"
              className="flex items-center gap-2 sm:gap-2.5 group focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-xl shrink-0"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 shrink-0 ring-1 ring-white/20 group-hover:scale-105 transition-transform">
                <Shield className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-sm tracking-tight text-slate-900 dark:text-white">
                    WACT
                  </span>
                  <span className="text-[9px] sm:text-[9.5px] font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-200 dark:border-blue-400/30 uppercase">
                    Integrity
                  </span>
                </div>
                <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
                  Saluran Pengaduan Anonim
                </span>
              </div>
            </Link>

            {/* Mobile Row 1 Right: Theme Toggle & Staff Backlink */}
            <div className="flex items-center gap-1 sm:hidden">
              <IntegrityThemeToggle />

              <Link
                href="/login"
                referrerPolicy="no-referrer"
                className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 transition-all flex items-center gap-1 text-xs font-semibold min-h-[36px]"
                title="Kembali ke Halaman Login WACT"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="text-[11px]">Staff</span>
              </Link>
            </div>
          </div>

          {/* Desktop Right & Mobile Row 2: Nav Switcher, Theme Toggle & Staff Link */}
          <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-3 w-full sm:w-auto">
            {/* Nav Switcher: Report vs Track (Full-width grid on mobile, inline on desktop) */}
            <div className="grid grid-cols-2 sm:flex items-center p-1 bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl w-full sm:w-auto gap-1">
              <Link
                href="/integrity/report"
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 sm:py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-all shadow-xs min-h-[36px] sm:min-h-[auto]"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Lapor Anonim</span>
              </Link>
              <Link
                href="/integrity/track"
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 sm:py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-all shadow-xs min-h-[36px] sm:min-h-[auto]"
              >
                <Search className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Cek Status</span>
              </Link>
            </div>

            {/* Desktop Actions */}
            <div className="hidden sm:flex items-center gap-2">
              <IntegrityThemeToggle />

              <Link
                href="/login"
                referrerPolicy="no-referrer"
                className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-all flex items-center gap-1.5 text-xs font-semibold"
                title="Kembali ke Halaman Login WACT"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Portal Staff</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3.5 sm:px-6 py-6 sm:py-12 relative min-w-0">
        {children}
      </main>

      {/* Bottom Compliance & Privacy Footer */}
      <footer className="relative z-10 border-t border-slate-200/90 dark:border-slate-900/80 bg-white/70 dark:bg-slate-950/60 backdrop-blur-xs py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600 dark:text-slate-400 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <Lock className="w-3 h-3" />
            </div>
            <span>Identitas pelapor <strong>100% aman</strong> & tidak disimpan oleh sistem WACT.</span>
          </div>
          <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500 dark:text-slate-500">
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
