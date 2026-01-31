import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";

function CouponCardSkeleton() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="p-0">
        <Skeleton className="w-full h-56 rounded-t-lg rounded-b-none" />
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-48" />
      </CardContent>
      <CardFooter className="p-6 bg-gray-50">
        <Skeleton className="h-10 w-24 ml-auto" />
      </CardFooter>
    </Card>
  );
}

export function LidlPageSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row">
      <div className="h-full border-r pr-4">
        <Skeleton className="h-6 w-20 mb-4" />
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-6 w-4" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-6 w-4" />
          </div>
        </div>
        <Skeleton className="h-12 w-40 mt-8" />
      </div>
      <div className="md:ml-4 mt-4 grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <CouponCardSkeleton key={`skeleton-${i}`} />
        ))}
      </div>
    </div>
  );
}
