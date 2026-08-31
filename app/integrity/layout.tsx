// app/integrity/layout.tsx
// Public Integrity Center Layout (Isolated from internal AppShell)
// Zero session dependency, high-trust enterprise compliance visual styling.

import Link from 'next/link';
import { Shield, ShieldAlert, Search, ArrowLeft, Lock } from 'lucide-react';

export const metadata = {
  title: 'WACT Integrity Center — Laporan Anonim & Pelacakan',
  description: 'Pusat pengaduan pelanggaran integritas operasional gudang secara anonim dan terpercaya.',
};

export default function IntegrityPublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-500 selection:text-white">
      {/* Background Ambient Blueprint Glow */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.15),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(99,102,241,0.12),transparent_50%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-60" />

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Integrity Brand */}
          <div className="flex items-center gap-3">
            <Link
              href="/integrity/report"
              className="flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-xl"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0 ring-1 ring-white/10 group-hover:scale-105 transition-transform">
                <Shield className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-sm tracking-tight text-white">WACT</span>
                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    INTEGRITY
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">
                  Pusat Pengaduan Anonim
                </span>
              </div>
            </Link>
          </div>

          {/* Nav Switcher: Report vs Track */}
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="flex items-center p-1 bg-slate-900/90 border border-slate-800 rounded-xl">
              <Link
                href="/integrity/report"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Lapor Anonim</span>
                <span className="sm:hidden">Lapor</span>
              </Link>
              <Link
                href="/integrity/track"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <Search className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Cek Status</span>
                <span className="sm:hidden">Status</span>
              </Link>
            </div>

            <Link
              href="/login"
              referrerPolicy="no-referrer"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all flex items-center gap-1.5 text-xs font-semibold"
              title="Kembali ke Halaman Login WACT"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden md:inline">Portal Staff</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="relative z-10 flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {children}
      </main>

      {/* Bottom Compliance & Privacy Footer */}
      <footer className="relative z-10 border-t border-slate-900/80 bg-slate-950/60 py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Identitas pelapor tidak disimpan atau ditampilkan oleh WACT.</span>
          </div>
          <p className="text-[11px] text-slate-600">
            &copy; 2026 WACT Enterprise Integrity Center
          </p>
        </div>
      </footer>
    </div>
  );
}
