import { SkeletonPageHeader, SkeletonTable } from '@/components/shared/SkeletonCard';

export default function UsersLoading() {
  return (
    <div className="page-padding py-5 max-w-6xl mx-auto space-y-4 animate-in fade-in duration-200">
      <SkeletonPageHeader hasAction={true} />
      <SkeletonTable rows={6} cols={4} />
    </div>
  );
}
