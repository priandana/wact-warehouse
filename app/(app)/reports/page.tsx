// app/(app)/reports/page.tsx
import type { Metadata } from 'next';
import { FileText } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';

export const metadata: Metadata = { title: 'Laporan' };

export default function ReportsPage() {
  return (
    <div className="page-padding py-5 max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Laporan Operasional
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Ekspor rekapitulasi data kasus dan audit ke format Excel / PDF
        </p>
      </div>

      <EmptyState
        icon={FileText}
        title="Modul Laporan Sedang Disiapkan"
        description="Fitur export spreadsheet dan rangkuman bulanan akan aktif di fase laporan."
      />
    </div>
  );
}
