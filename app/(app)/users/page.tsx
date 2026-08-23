// app/(app)/users/page.tsx
import type { Metadata } from 'next';
import { Building2 } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';

export const metadata: Metadata = { title: 'Manajemen Pengguna' };

export default function UsersPage() {
  return (
    <div className="page-padding py-5 max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Pengguna & Penugasan Gudang
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Kelola peran pengguna dan akses multi-warehouse
        </p>
      </div>

      <EmptyState
        icon={Building2}
        title="Modul Pengguna Sedang Disiapkan"
        description="Manajemen role dan assignment user-warehouse akan hadir di fase admin."
      />
    </div>
  );
}
