import { Skeleton } from "@/components/ui/skeleton";

export function ReceiptsPageSkeleton() {
  return (
    <div>
      <Skeleton className="h-8 w-24 mb-4" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-20" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={`header-skeleton-${i}`} className="h-6 w-full max-w-md ml-4" />
        ))}
      </div>
      <Skeleton className="h-6 w-48 mt-6 mb-2" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={`content-skeleton-${i}`} className="h-5 w-full max-w-lg" />
        ))}
      </div>
    </div>
  );
}
