import { SkeletonPageHeader, SkeletonSummaryGrid, SkeletonTable } from '@/components/shared/SkeletonCard';

export default function MaintenanceLoading() {
  return (
    <div className="page-padding py-5 max-w-7xl mx-auto space-y-5 animate-in fade-in duration-200">
      <SkeletonPageHeader hasAction={true} hasTabs={true} />
      <SkeletonSummaryGrid count={4} />
      <SkeletonTable rows={5} cols={5} />
    </div>
  );
}
