// components/shared/SkeletonCard.tsx
// Comprehensive shimmer skeleton building blocks for route loading states

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

export function SkeletonPageHeader({
  hasAction = true,
  hasTabs = false,
}: {
  hasAction?: boolean;
  hasTabs?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-48 rounded-lg" />
          <Skeleton className="h-3.5 w-64 rounded-md" />
        </div>
        {hasAction && (
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-28 sm:w-32 rounded-xl" />
          </div>
        )}
      </div>
      {hasTabs && (
        <div className="flex items-center gap-2 border-b border-slate-200/70 pb-2 overflow-x-auto">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-lg shrink-0" />
          ))}
        </div>
      )}
    </div>
  );
}

export function SkeletonFilterBar({ selectCount = 3 }: { selectCount?: number }) {
  return (
    <div className="p-3.5 rounded-2xl bg-white border border-slate-200/60 shadow-xs space-y-3">
      <div className="flex flex-col sm:flex-row items-center gap-2.5">
        <Skeleton className="h-9 w-full sm:flex-1 rounded-xl" />
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {Array.from({ length: selectCount }).map((_, i) => (
            <Skeleton key={i} className="h-9 flex-1 sm:w-32 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-200/60 shadow-xs space-y-3">
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

export function SkeletonSummaryGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 rounded-2xl bg-white border border-slate-200/60 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-16 rounded-md" />
            <Skeleton className="w-8 h-8 rounded-xl" />
          </div>
          <Skeleton className="h-7 w-16 rounded-md" />
          <Skeleton className="h-3 w-24 rounded-md" />
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

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200/60 shadow-xs overflow-hidden">
      <div className="p-3.5 bg-slate-50/70 border-b border-slate-200/60 flex items-center justify-between">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-20 rounded-md" />
        ))}
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
              <div className="space-y-1.5 flex-1 min-w-0">
                <Skeleton className="h-4 w-3/4 max-w-xs rounded-md" />
                <Skeleton className="h-3 w-1/2 max-w-[200px] rounded-md" />
              </div>
            </div>
            <Skeleton className="h-6 w-20 rounded-full shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonDetailLayout() {
  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="p-5 rounded-3xl bg-white border border-slate-200/60 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-36 rounded-lg" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-5 w-2/3 rounded-md" />
        <div className="flex flex-wrap gap-3 pt-2">
          <Skeleton className="h-4 w-24 rounded-md" />
          <Skeleton className="h-4 w-28 rounded-md" />
          <Skeleton className="h-4 w-32 rounded-md" />
        </div>
      </div>

      {/* Main Grid: Content + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-3xl bg-white border border-slate-200/60 shadow-xs space-y-3">
            <Skeleton className="h-5 w-32 rounded-md" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
          <div className="p-5 rounded-3xl bg-white border border-slate-200/60 shadow-xs space-y-3">
            <Skeleton className="h-5 w-40 rounded-md" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-white border border-slate-200/60 shadow-xs space-y-3">
            <Skeleton className="h-5 w-28 rounded-md" />
            <Skeleton className="h-9 w-full rounded-xl" />
            <Skeleton className="h-9 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonWizardLayout() {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="p-4 rounded-2xl bg-white border border-slate-200/60 shadow-xs flex items-center justify-between">
        <Skeleton className="h-5 w-28 rounded-md" />
        <Skeleton className="h-4 w-16 rounded-md" />
      </div>
      <div className="p-6 rounded-3xl bg-white border border-slate-200/60 shadow-xs space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48 rounded-md" />
          <Skeleton className="h-3.5 w-64 rounded-md" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <Skeleton className="h-10 w-24 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
