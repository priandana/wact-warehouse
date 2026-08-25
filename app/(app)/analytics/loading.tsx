// app/(app)/analytics/loading.tsx
// WACT V2 Skeleton Loading State for Analytics Command Center

import { SkeletonPageHeader, SkeletonSummaryGrid, SkeletonCard } from '@/components/shared/SkeletonCard';

export default function AnalyticsLoading() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6">
      {/* Header Skeleton */}
      <SkeletonPageHeader />

      {/* 5 KPI Summary Cards Skeleton */}
      <SkeletonSummaryGrid count={5} />

      {/* Operational Snapshot Banner Skeleton */}
      <div className="h-28 rounded-2xl bg-slate-100 animate-pulse" />

      {/* Trend Chart Skeleton */}
      <div className="h-72 rounded-2xl bg-white border border-slate-200/80 p-6 space-y-4">
        <div className="h-5 w-48 bg-slate-200 rounded-md animate-pulse" />
        <div className="h-48 w-full bg-slate-100 rounded-xl animate-pulse" />
      </div>

      {/* Distribution Grid Skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
