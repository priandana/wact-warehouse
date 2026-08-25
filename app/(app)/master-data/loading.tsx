// app/(app)/master-data/loading.tsx
import { SkeletonPageHeader, SkeletonCard } from '@/components/shared/SkeletonCard';

export default function MasterDataLoading() {
  return (
    <div className="page-padding py-5 max-w-6xl mx-auto space-y-5 animate-in fade-in duration-200">
      {/* Header skeleton */}
      <SkeletonPageHeader hasAction={true} hasTabs={true} />

      {/* Tabs Skeleton */}
      <div className="h-11 bg-slate-100/80 rounded-2xl animate-pulse" />

      {/* Cards Skeleton Grid */}
      <div className="space-y-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
