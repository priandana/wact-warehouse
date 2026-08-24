import { SkeletonPageHeader, SkeletonFilterBar, SkeletonTable, SkeletonCard } from '@/components/shared/SkeletonCard';

export default function AssetsLoading() {
  return (
    <div className="page-padding py-5 max-w-6xl mx-auto space-y-4 animate-in fade-in duration-200">
      <SkeletonPageHeader hasAction={true} />
      <SkeletonFilterBar selectCount={4} />

      <div className="hidden md:block">
        <SkeletonTable rows={6} cols={6} />
      </div>
      <div className="md:hidden space-y-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
