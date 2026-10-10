import { Skeleton } from "@/components/ui/skeleton";

export default function BoardLoading() {
  return (
    <div className="space-y-6">
      {/* Top Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* 6 Kanban Columns Skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
        {Array.from({ length: 6 }).map((_, colIdx) => (
          <div
            key={colIdx}
            className="flex flex-col rounded-xl border border-border bg-card/60 p-3 shadow-xs min-h-[500px] space-y-3"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-6 rounded-full" />
            </div>

            {/* Card Skeletons */}
            {Array.from({ length: colIdx % 2 === 0 ? 3 : 2 }).map((_, cardIdx) => (
              <div
                key={cardIdx}
                className="rounded-lg border border-border bg-background p-3.5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <div className="space-y-1">
                      <Skeleton className="h-3.5 w-20" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-10 rounded" />
                </div>
                <Skeleton className="h-3 w-24" />
                <div className="flex gap-1.5">
                  <Skeleton className="h-4 w-14 rounded" />
                  <Skeleton className="h-4 w-16 rounded" />
                </div>
                <div className="pt-2 border-t border-border flex justify-between">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
