import { SkeletonPageHeader, SkeletonTable } from '@/components/shared/SkeletonCard';

export default function NotificationsLoading() {
  return (
    <div className="page-padding py-5 max-w-4xl mx-auto space-y-4 animate-in fade-in duration-200">
      <SkeletonPageHeader hasAction={false} />
      <SkeletonTable rows={5} cols={3} />
    </div>
  );
}
