// app/(app)/master-data/page.tsx
import type { Metadata } from 'next';
import { Settings } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';

export const metadata: Metadata = { title: 'Master Data' };

export default function MasterDataPage() {
  return (
    <div className="page-padding py-5 max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Pengaturan Master Data
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Kelola Area, Lokasi, Kategori Kasus, dan Root Cause
        </p>
      </div>

      <EmptyState
        icon={Settings}
        title="Modul Master Data Sedang Disiapkan"
        description="Konfigurasi area dan lookup tables akan hadir di fase admin."
      />
    </div>
  );
}
