import { SkeletonSummaryGrid, SkeletonPageHeader, SkeletonCard } from '@/components/shared/SkeletonCard';
import { Skeleton } from '@/components/shared/SkeletonCard';

export default function DashboardLoading() {
  return (
    <div className="page-padding py-5 max-w-7xl mx-auto space-y-5 animate-in fade-in duration-200">
      <SkeletonPageHeader hasAction={true} />

      {/* KPI Metrics */}
      <SkeletonSummaryGrid count={5} />

      {/* Quick Action & Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 p-5 rounded-3xl bg-white border border-slate-200/60 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-36 rounded-md" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <Skeleton className="h-56 w-full rounded-2xl" />
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/60 shadow-xs space-y-3">
          <Skeleton className="h-5 w-32 rounded-md" />
          <div className="space-y-2.5">
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-2xl" />
          </div>
        </div>
      </div>

      {/* Recent Activity List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-40 rounded-md" />
          <Skeleton className="h-4 w-20 rounded-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}
