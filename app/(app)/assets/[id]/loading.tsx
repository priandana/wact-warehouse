import { SkeletonDetailLayout } from '@/components/shared/SkeletonCard';

export default function AssetDetailLoading() {
  return (
    <div className="page-padding py-5 max-w-6xl mx-auto animate-in fade-in duration-200">
      <SkeletonDetailLayout />
    </div>
  );
}
