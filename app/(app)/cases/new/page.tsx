// app/(app)/cases/new/page.tsx
import type { Metadata } from 'next';
import { PlusCircle } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Laporkan Kasus Baru' };

export default function NewCasePage() {
  return (
    <div className="page-padding py-5 max-w-xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Laporkan Kasus Baru
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Formulir pelaporan insiden, kerusakan mesin, dan anomali gudang
        </p>
      </div>

      <EmptyState
        icon={PlusCircle}
        title="Form Pelaporan Kasus Sedang Disiapkan"
        description="Formulir interaktif dengan upload bukti foto dan kalkulasi otomatis SLA akan hadir di tahap berikutnya."
        action={
          <Link
            href="/cases"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs hover:bg-blue-700 transition-colors"
          >
            <span>Kembali ke Daftar Kasus</span>
          </Link>
        }
      />
    </div>
  );
}
