// app/(app)/inspections/page.tsx
import type { Metadata } from 'next';
import { ClipboardCheck } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';

export const metadata: Metadata = { title: 'QC & Inspeksi' };

export default function InspectionsPage() {
  return (
    <div className="page-padding py-5 max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          QC & Inspeksi Rutin
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Audit checklist kebersihan, keamanan, dan fungsi alat
        </p>
      </div>

      <EmptyState
        icon={ClipboardCheck}
        title="Modul Inspeksi QC Sedang Disiapkan"
        description="Checklist audit berkala dan pembuatan template akan aktif di fase berikutnya."
      />
    </div>
  );
}
