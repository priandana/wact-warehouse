import { SkeletonPageHeader, SkeletonCard } from '@/components/shared/SkeletonCard';

export default function MyTasksLoading() {
  return (
    <div className="page-padding py-5 max-w-5xl mx-auto space-y-4 animate-in fade-in duration-200">
      <SkeletonPageHeader hasAction={false} hasTabs={true} />
      <div className="space-y-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
