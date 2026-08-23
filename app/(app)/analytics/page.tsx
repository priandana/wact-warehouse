// app/(app)/analytics/page.tsx
import type { Metadata } from 'next';
import { BarChart2 } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';

export const metadata: Metadata = { title: 'Analitik' };

export default function AnalyticsPage() {
  return (
    <div className="page-padding py-5 max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Analisis & Tren Operasional
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Insight performa penyelesaian kasus dan kepatuhan SLA
        </p>
      </div>

      <EmptyState
        icon={BarChart2}
        title="Modul Analitik Sedang Disiapkan"
        description="Grafik tren insiden, MTTR, dan heatmap area akan aktif di fase analitik."
      />
    </div>
  );
}
