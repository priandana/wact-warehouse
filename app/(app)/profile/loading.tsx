import { SkeletonPageHeader, Skeleton } from '@/components/shared/SkeletonCard';

export default function ProfileLoading() {
  return (
    <div className="page-padding py-5 max-w-4xl mx-auto space-y-4 animate-in fade-in duration-200">
      <SkeletonPageHeader hasAction={false} />
      <div className="p-6 rounded-3xl bg-white border border-slate-200/60 shadow-xs space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40 rounded-md" />
            <Skeleton className="h-3.5 w-56 rounded-md" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
