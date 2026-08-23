// app/(app)/maintenance/page.tsx
import type { Metadata } from 'next';
import { Wrench } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';

export const metadata: Metadata = { title: 'Maintenance' };

export default function MaintenancePage() {
  return (
    <div className="page-padding py-5 max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Pemeliharaan & Maintenance
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Log pekerjaan reparasi dan penggantian suku cadang mesin
        </p>
      </div>

      <EmptyState
        icon={Wrench}
        title="Modul Maintenance Sedang Disiapkan"
        description="Fitur pencatatan action log maintenance akan hadir di fase berikutnya."
      />
    </div>
  );
}
