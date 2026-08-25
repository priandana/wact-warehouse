// app/(app)/users/loading.tsx
import { SkeletonPageHeader, SkeletonCard } from '@/components/shared/SkeletonCard';

export default function UsersLoading() {
  return (
    <div className="page-padding py-5 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      <SkeletonPageHeader hasAction={true} />

      {/* Summary KPI Skeletons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 rounded-2xl bg-white border border-slate-200/80 p-4 animate-pulse" />
        ))}
      </div>

      {/* Search and Filters Bar Skeleton */}
      <div className="h-24 rounded-2xl bg-white border border-slate-200/80 p-4 animate-pulse" />

      {/* User Cards Grid Skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-56 rounded-3xl bg-white border border-slate-200/80 p-5 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
