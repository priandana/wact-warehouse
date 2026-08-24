import { SkeletonDetailLayout } from '@/components/shared/SkeletonCard';

export default function InspectionDetailLoading() {
  return (
    <div className="page-padding py-5 max-w-5xl mx-auto animate-in fade-in duration-200">
      <SkeletonDetailLayout />
    </div>
  );
}
