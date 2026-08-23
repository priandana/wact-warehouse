// app/(app)/assets/page.tsx
import type { Metadata } from 'next';
import { Package } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';

export const metadata: Metadata = { title: 'Aset & Mesin' };

export default function AssetsPage() {
  return (
    <div className="page-padding py-5 max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Aset & Peralatan Gudang
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Monitoring status operasional dan riwayat maintenance aset
        </p>
      </div>

      <EmptyState
        icon={Package}
        title="Modul Aset Sedang Disiapkan"
        description="Fitur manajemen aset dan QR Scanner akan aktif pada fase berikutnya."
      />
    </div>
  );
}
