// app/(app)/notifications/page.tsx
import type { Metadata } from 'next';
import { Bell } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';

export const metadata: Metadata = { title: 'Notifikasi' };

export default function NotificationsPage() {
  return (
    <div className="page-padding py-5 max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Notifikasi
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Pembaruan status kasus, penugasan, dan pengingat SLA
        </p>
      </div>

      <EmptyState
        icon={Bell}
        title="Tidak ada notifikasi baru"
        description="Semua pembaruan kasus penting akan muncul di sini."
      />
    </div>
  );
}
