import { Skeleton } from "@/components/ui/skeleton";

export function RoomDetailSkeleton() {
  return (
    <div>
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-6 w-32" />
      </div>
      <div className="flex items-center mt-2 gap-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="mt-8 gap-2 flex flex-col">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full max-w-xs" />
        <div className="flex items-center gap-3 mt-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-full mt-2" />
      </div>
      <Skeleton className="h-64 w-full mt-4" />
    </div>
  );
}
