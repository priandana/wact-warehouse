import { SkeletonPageHeader, SkeletonFilterBar, SkeletonTable } from '@/components/shared/SkeletonCard';

export default function ReportsLoading() {
  return (
    <div className="page-padding py-5 max-w-6xl mx-auto space-y-4 animate-in fade-in duration-200">
      <SkeletonPageHeader hasAction={true} />
      <SkeletonFilterBar selectCount={3} />
      <SkeletonTable rows={5} cols={5} />
    </div>
  );
}
