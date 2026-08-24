import { SkeletonPageHeader, SkeletonFilterBar, SkeletonTable, SkeletonCard } from '@/components/shared/SkeletonCard';

export default function CasesLoading() {
  return (
    <div className="page-padding py-5 max-w-7xl mx-auto space-y-4 animate-in fade-in duration-200">
      <SkeletonPageHeader hasAction={true} hasTabs={true} />
      <SkeletonFilterBar selectCount={3} />

      {/* Desktop Table View & Mobile Cards */}
      <div className="hidden md:block">
        <SkeletonTable rows={6} cols={5} />
      </div>
      <div className="md:hidden space-y-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
