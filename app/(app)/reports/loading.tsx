// app/(app)/reports/loading.tsx
// WACT V2 Skeleton Loading State for Reports Workspace

import { SkeletonPageHeader, SkeletonCard, SkeletonTable } from '@/components/shared/SkeletonCard';

export default function ReportsLoading() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6">
      {/* Header Skeleton */}
      <SkeletonPageHeader />

      {/* 3 Report Type Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Filter Bar Skeleton */}
      <div className="h-16 rounded-2xl bg-white border border-slate-200/80 p-4 animate-pulse" />

      {/* Table Skeleton */}
      <SkeletonTable rows={8} />
    </div>
  );
}
