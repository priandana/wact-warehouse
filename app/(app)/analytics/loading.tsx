import { SkeletonPageHeader, SkeletonSummaryGrid, Skeleton } from '@/components/shared/SkeletonCard';

export default function AnalyticsLoading() {
  return (
    <div className="page-padding py-5 max-w-7xl mx-auto space-y-5 animate-in fade-in duration-200">
      <SkeletonPageHeader hasAction={false} />
      <SkeletonSummaryGrid count={4} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200/60 shadow-xs space-y-3">
          <Skeleton className="h-5 w-44 rounded-md" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
        <div className="p-5 rounded-3xl bg-white border border-slate-200/60 shadow-xs space-y-3">
          <Skeleton className="h-5 w-44 rounded-md" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
