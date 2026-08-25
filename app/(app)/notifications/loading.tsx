// app/(app)/notifications/loading.tsx
// Skeleton loader for Notifications Center

export default function NotificationsLoading() {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 animate-pulse">
      {/* Header Skeleton */}
      <div className="h-24 bg-white rounded-2xl border border-slate-200/80 p-5 flex items-center justify-between shadow-2xs">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-slate-200 rounded-lg" />
          <div className="h-3.5 w-72 bg-slate-100 rounded-md" />
        </div>
        <div className="h-9 w-36 bg-slate-100 rounded-xl" />
      </div>

      {/* Filter Tabs Skeleton */}
      <div className="flex gap-2">
        <div className="h-9 w-20 bg-slate-200 rounded-xl" />
        <div className="h-9 w-28 bg-slate-200 rounded-xl" />
        <div className="h-9 w-40 bg-slate-200 rounded-xl" />
        <div className="h-9 w-36 bg-slate-200 rounded-xl" />
      </div>

      {/* Card Skeletons */}
      <div className="space-y-2.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3"
          >
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <div className="h-5 w-24 bg-slate-200 rounded-md" />
                <div className="h-5 w-16 bg-slate-100 rounded-md" />
              </div>
              <div className="h-4 w-20 bg-slate-100 rounded" />
            </div>
            <div className="h-4 w-3/4 bg-slate-200 rounded" />
            <div className="h-3 w-1/2 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
