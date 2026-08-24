import { SkeletonPageHeader, SkeletonSummaryGrid, SkeletonTable } from '@/components/shared/SkeletonCard';

export default function MaintenanceLoading() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-5 animate-in fade-in duration-200">
      <SkeletonPageHeader hasAction={false} hasTabs={true} />
      <SkeletonSummaryGrid count={4} />
      <SkeletonTable rows={5} cols={6} />
    </div>
  );
}
