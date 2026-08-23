// components/shared/SkeletonCard.tsx
// Shimmer skeleton loading placeholder for case cards and lists

import { cn } from '@/lib/utils/cn';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-xl bg-slate-200/70',
        className,
      )}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-200/60 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-28 rounded-md" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-5 w-4/5 rounded-md" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-32 rounded-md" />
        <Skeleton className="h-4 w-20 rounded-md" />
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-4 w-24 rounded-md" />
        </div>
        <Skeleton className="h-5 w-5 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonSummaryGrid() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-4 rounded-2xl bg-white border border-slate-200/60 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-16 rounded-md" />
            <Skeleton className="w-8 h-8 rounded-xl" />
          </div>
          <Skeleton className="h-7 w-12 rounded-md" />
          <Skeleton className="h-3 w-20 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
